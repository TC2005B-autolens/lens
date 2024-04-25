import { EventEmitter } from "events";
import { nanoid } from "nanoid";
import tar from "tar-stream";
import { z } from 'zod';
import docker from "./environment/docker";
import { logger } from "./environment/logger";
import redis from "./environment/redis";
import { Assignment } from "./models/assignment";
import { NanoID } from "./models/common";
import { Job } from "./models/job";
import { Submission } from "./models/submission";

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
                return { ...sFile, main: false, write: true };
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

    static async compressFiles(job: Job): Promise<Uint8Array> {
        const files = job.files;
        const pack = tar.pack();
        for (let f of files) {
            let mode = 0o644;
            if (f.write) mode |= 0o022;

            pack.entry({ name: `source/${f.path}`, mode }, atob(f.content));
        }
        pack.entry( { name: 'job.json', mode: 600 }, JSON.stringify(job));
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
        const compressed = await GradingJob.compressFiles(job);
        logger.debug(`job ${job.id}: compressed ${compressed.length} bytes\n    - id: ${fileId}`);
        await redis.set(`job:${job.id}:tar`, Buffer.from(compressed), { EX: 300 });
        await redis.set(`job:${job.id}:tar:id`, fileId, { EX: 300 });
        // TODO: the URL should not reference localhost
        const buildStream = await docker.buildImage(`.lens/kits/${job.language}.tar.gz`, {
            t: `lenskit-job-${job.language}:${job.id}`,
            buildargs: {
                source_url: `http://localhost:3000/api/v1/jobs/${job.id}`,
                source_file: `${fileId}.tar.gz`
            },
        });
        await new Promise((resolve, reject) => {
            docker.modem.followProgress(buildStream, (err, res) => err ? reject(err) : resolve(res), data => {
                logger.debug(data);
            });
        });
    }
}

const gradingJob = new GradingJob();
export default gradingJob;
