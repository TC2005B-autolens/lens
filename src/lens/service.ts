import type { JobProgress, Job as LensJob } from '../models/job';
import { Queue, Job, Worker, UnrecoverableError } from 'bullmq';
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
    job.updateProgress({
        status: 'building',
        substage: 'compressing job files',
    } as JobProgress)

    const kit = kits.get(job.data.language);
    if (!kit) {
        logger.error(`job ${job.id}: kit ${job.data.language} not found`);
        throw new UnrecoverableError(`kit ${job.data.language} not found`);
    }

    const archive = await generateArchive(job.data);
    logger.trace(`job ${job.id}: compressed ${archive.length} bytes`);
    await redis.set(`job:${job.id}:tar`, Buffer.from(archive), { EX: 300 });

    const container = new Container(job.data);
    // TODO: send build progress via redis streams
    const buildStream = await container.build();
    logger.trace(`job ${job.id}: build started`);
    job.updateProgress({
        substage: 'building Docker image'
    } as JobProgress);
    try {
        await container.buildFinished();
    } catch (e) {
        logger.error(`job ${job.id}: error building`);
        logger.error(e);
        throw new Error('Error building');
    }

    job.updateProgress({
        status: 'testing',
        tests: job.data.tests.reduce((acc, test) => {
            acc[test.id] = 'running';
            return acc;
        }, {} as Record<string, 'running'>)
    } as JobProgress);

    const instances = job.data.tests.map(test => {
        logger.trace(`job ${job.id}: running test ${test.id}`);
        return container.runTest(test);
    });

    try {
        // TODO: handle non-zero exit codes
        // the first object of the result contains the exit code
        const results = await Promise.all(instances);
        for (let result of results) {
            if (result[0].StatusCode !== 0) {
                logger.error(`job ${job.id}: test failed`);
                throw new Error('Test failed');
            }
        }
        job.updateProgress({
            status: 'completed',
        } as JobProgress);
    } catch (e) {
        logger.error(`job ${job.id}: error running tests: ${e}`);
        throw new Error('Error running tests');
    }
}

async function cleanup(job: LensJob) {
    const containers = await docker.listContainers();
    for (let container of containers) {
        if (container.Labels['com.auto.lens.job'] !== job.id) continue;
        await docker.getContainer(container.Id).stop();
        await docker.getContainer(container.Id).remove();
    }
    try {
        await docker.getImage(`lenskit-job-${job.language}:${job.id}`).remove({
            force: true
        });
        logger.trace(`job ${job.id}: removing image`);
    } catch (err) {
        logger.error(`job ${job.id}: error removing image: ${err}`);
    }
}

const queue = new Queue<LensJob>('lens-run', { connection: redisConnection });

const worker = new Worker('lens-run', processJob, {
    connection: redisConnection,
    concurrency: 10,
});

worker.on('failed', async (job: Job<LensJob> | undefined, err: Error) => {
    if (!job) return;
    job.updateProgress({
        status: 'failed',
        error: err.message
    } as JobProgress);
    logger.error(`job ${job.id} failed: ${err}`);
    logger.trace(`job ${job.id}: cleaning up`);
    await cleanup(job.data);
});

worker.on('completed', async (job: Job<LensJob>) => {
    logger.trace(`job ${job.id}: cleaning up`);
    await cleanup(job.data);
    await redis.json.del(`job:${job.id}`);
    await redis.del(`job:${job.id}:tar`);
});

// TODO: implement progress event


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
