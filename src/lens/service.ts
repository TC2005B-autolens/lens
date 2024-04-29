import type { Job as LensJob } from '../models/job';
import { Queue, Job, Worker } from 'bullmq';
import tar from "tar-stream";
import redis, { connection as redisConnection } from '../environment/redis';
import { logger } from '../environment/logger';
import docker from '../environment/docker';
import kits from './kit';
import type { Submission } from '../models/submission';
import type { Assignment, AssignmentFiles } from '../models/assignment';
import { nanoid } from 'nanoid';
import { Container } from './container';

function generateArchive(job: LensJob): Promise<Uint8Array> {
    const files = job.files;
    const pack = tar.pack();
    for (let f of files) {
        let mode = 0o644;
        if (f.write) mode |= 0o022;

        pack.entry({ name: `submission/${f.path}`, mode }, atob(f.content));
    }
    pack.entry( { name: 'job.json', mode: 0o600 }, JSON.stringify(job));
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



async function processJob(job: Job<LensJob>) {
    // TODO: clean up, organize logs and use streams
    await redis.json.set(`job:${job.data.id}`, '$', job.data, { NX: true });

    const kit = kits.get(job.data.language);
    if (!kit) {
        logger.error(`job ${job.id}: kit ${job.data.language} not found`);
        // await redis.json.set(`job:${job.data.id}`, '$.status', 'failed');
        return;
    }

    const archive = await generateArchive(job.data);
    logger.trace(`job ${job.id}: compressed ${archive.length} bytes`);
    await redis.set(`job:${job.id}:tar`, Buffer.from(archive), { EX: 300 });

    const container = new Container(job.data);
    const buildStream = await container.build();
    logger.trace(`job ${job.id}: build started`);
    await container.buildFinished();

    const instances = job.data.tests.map(test => {
        logger.trace(`job ${job.id}: running test ${test.id}`);
        return container.runTest(test);
    });

    try {
        // TODO: handle non-zero exit codes
        // the first object of the result contains the exit code
        const results = await Promise.all(instances);
        logger.debug(`job ${job.id}: all tests completed`);
        logger.trace(results[0][0]);
        // await redis.json.set(`job:${job.id}`, '$.status', 'completed');
        logger.debug(`job ${job.id}: cleaning up`);
        results.forEach(async ([output, container]) => {
            await container.remove();
            logger.trace(`job ${job.id}: removed container ${container.id}`);
        });
        await docker.getImage(container.imageTag).remove({ force: true });
        logger.trace(`job ${job.id}: removed image ${container.imageTag}`);
    } catch (e) {
        logger.error(`job ${job.id}: error running tests: ${e}`);
    }
}

const queue = new Queue<LensJob>('lens-run', { connection: redisConnection });

const worker = new Worker('lens-run', processJob, {
    connection: redisConnection,
    concurrency: 10,
});

export class invalidSubmissionError extends Error {}

export function create(submission: Submission & { id: string }, assignment: Assignment & { id: string }): LensJob {
    const fileMap = new Map(assignment.files.map(f => [f.path, f]));
    submission.files.forEach(f => {
        const file = fileMap.get(f.path);
        if (file) {
            if (!file.write) throw new invalidSubmissionError(`file ${f.path} is not writable`);
            fileMap.set(f.path, {
                ...file,
                content: f.content
            })
            return;
        }
        // TODO: Add option to disallow student file creation
        fileMap.set(f.path, {
            ...f,
            main: false,
            write: true,
        });
    });

    return {
        ...assignment,
        id: nanoid(),
        files: Array.from(fileMap.values()),
        assignment_id: assignment.id,
        submission_id: submission.id,
        status: {
            status: 'pending'
        },
    };
}

export async function dispatch(job: LensJob) {
    return await queue.add('run', job, {
        jobId: job.id,
    })
}
