import { Job } from "./models/job";
import { Submission } from "./models/submission";
import { EventEmitter } from "events";
import { z } from 'zod';
import redis from "./redis";
import { NanoID } from "./models/common";
import { Assignment, AssignmentFiles } from "./models/assignment";
import { nanoid } from "nanoid";
import tar from "tar-stream";
import { logger } from "./logger";

const FullSubmission = Submission.extend({
    id: NanoID
}).required();
type FullSubmission = z.infer<typeof FullSubmission>;

interface GradingEvents extends EventEmitter {
    on(event: 'dispatch_job', listener: (job: Job) => void): this;
    emit(event: 'dispatch_job', job: Job): boolean;
}

// TODO: This should not be on the main thread.
// Creating tars may be slow and should be done in a worker thread.
class GradingJob {
    private events: GradingEvents = new EventEmitter();

    constructor() {
        this.events.on('dispatch_job', GradingJob.processJob);
    }
    
    public async dispatch(submission: FullSubmission): Promise<Job> {
        let assignment = Assignment.parse(await redis.json.get(`assignment:${submission.assignment}`));
        if (!assignment) {
            throw new Error(`Invalid submission: assignment ${submission.assignment} does not exist`);
        }
        assignment.files = submission.files.map(sFile => {
            let aFile = assignment.files.find(f => f.path === sFile.path);
            if (aFile) {
                return { ...aFile, content: sFile.content };
            } else {
                return { ...sFile, main: false, read: true, write: true };
            }
        });
        const job: Job = {
            id: nanoid(),
            status: "pending" as z.infer<typeof Job>['status'],
            submission_id: submission.id,
            assignment_id: submission.assignment,
            ...assignment,
        };
        this.events.emit('dispatch_job', job);
        return job;
    }

    static async compressFiles(files: AssignmentFiles): Promise<Uint8Array> {
        const pack = tar.pack();
        for (let f of files) {
            let mode = 0o600;
            if (f.read) mode |= 0o044;
            if (f.write) mode |= 0o022;

            pack.entry({ name: f.path, mode }, atob(f.content));
        }
        pack.finalize();

        return new Promise((resolve, reject) => {
            let chunks: any[] = [];

            pack.on('data', data => chunks.push(data));
            pack.on('end', () => resolve(
                Bun.gzipSync(Buffer.concat(chunks))
            ));
            pack.on('error', err => reject(`error compressing: ${err}`));
        });
    }

    static async processJob(job: Job) {
        await redis.json.set(`job:${job.id}`, '$', job, { NX: true });
        const fileId = nanoid();
        const compressed = await GradingJob.compressFiles(job.files);
        logger.debug(`job ${job.id}: compressed ${compressed.length} bytes\n    - id: ${fileId}`);
        await redis.set(`job:${job.id}:tar`, Buffer.from(compressed), { EX: 300 });
        await redis.set(`job:${job.id}:tar:id`, fileId, { EX: 300 });
    }
}

const gradingJob = new GradingJob();
export default gradingJob;
