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
    logger.debug(`job ${job.id}: status is ${job.data.status.status}`);
    await redis.json.set(`job:${job.data.id}`, '$', job.data, { NX: true });

    const kit = kits.get(job.data.language);
    if (!kit) {
        logger.error(`job ${job.id}: kit ${job.data.language} not found`);
        // await redis.json.set(`job:${job.data.id}`, '$.status', 'failed');
        return;
    }

    const archive = await generateArchive(job.data);
    logger.debug(`job ${job.id}: compressed ${archive.length} bytes`);
    
    await redis.set(`job:${job.id}:tar`, Buffer.from(archive), { EX: 300 });

    const imageTag = `lenskit-job-${job.data.language}:${job.data.id}`;
    const buildStream = await docker.buildImage({ context: `kits/${job.data.language}/`, src: ['Dockerfile']}, {
        t: imageTag,
        buildargs: {
            source_url: `http://localhost:3000/api/v1/jobs/${job.id}`,
            source_file: `archive.tar.gz`,
            base_image: `${job.data.language}-1`,
        },
        rm: true,
        networkmode: 'lens_isolated'
    });
    logger.debug(`job ${job.id}: building image...`);
    try {
        await new Promise((resolve, reject) => {
            docker.modem.followProgress(
                buildStream,
                (err, res) => {
                    if (err !== null || res.length == 0 || res[res.length - 1].error) {
                        reject({
                            error: err || res[res.length - 1].error,
                            stream: res
                        });
                        return;
                    }
                    resolve(res);
                }
            );
        });
    } catch (e) {
        const info = (e as any);
        logger.error(`job ${job.id}: error building image: ${info.error}`);
        // logger.error(info);
        // await redis.json.set(`job:${job.id}`, '$.status', 'failed');
        return;
    }
    logger.debug(`job ${job.id}: image built, id: ${imageTag}`);
    const containers = job.data.tests.map((test) => {
        const ctx = kits.generateContext(kit, job.data, test.id);
        const cmdTemplate = kit.tests.find(t => t.type === test.type)?.cmd;
        if (!cmdTemplate) {
            logger.error(`job ${job.id}: test ${test.id} type ${test.type} not found in kit`);
            throw new Error(`unsupported test type: ${test.type}`);
        }
        const cmd = kits.fillCommands(cmdTemplate, ctx);
        logger.debug(`job ${job.id}: running test ${test.id} with command ${cmd}`);
        return docker.run(imageTag, cmd, process.stdout, {
            HostConfig: {
                Binds: [ 'lens_api_sock:/var/run/lens:ro' ],
                NetworkMode: 'lens_isolated'
            }
        }).then((out) => {
            logger.debug(`job ${job.id}: test ${test.id} completed`);
            return out;
        });
    });

    try {
        const results = await Promise.all(containers);
        logger.debug(`job ${job.id}: all tests completed`);
        logger.debug(results[0][0]);
        // await redis.json.set(`job:${job.id}`, '$.status', 'completed');
        logger.debug(`job ${job.id}: cleaning up`);
        results.forEach(async ([stream, container]) => {
            await container.remove();
            logger.debug(`job ${job.id}: removed container ${container.id}`);
        });
        await docker.getImage(imageTag).remove({ force: true });
        logger.debug(`job ${job.id}: removed image ${imageTag}`);
    } catch (e) {
        logger.error(`job ${job.id}: error running tests: ${e}`);
        // await redis.json.set(`job:${job.id}`, '$.status', 'failed');
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
