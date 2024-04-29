import type { Job } from "../models/job";
import docker from "../environment/docker";
import { logger } from "../environment/logger";
import type { KitManifest } from "./kit";
import kits from './kit';
import type { Test, TestResult } from "../models/test";
import { saveResult } from "../controllers/job";
import { once } from 'events';

export class Container {
    job: Job;
    kit: KitManifest;
    imageTag: string;
    buildStream?: NodeJS.ReadableStream;

    constructor(job: Job) {
        this.job = job;
        const kit = kits.get(job.language);
        if (!kit) throw new Error(`kit ${job.language} not found`);
        this.kit = kit;
        this.imageTag = `lenskit-job-${job.language}:${job.id}`;
    }

    async build() {
        const buildStream = await docker.buildImage({ context: `kits/${this.job.language}/`, src: ['Dockerfile']}, {
            t: this.imageTag,
            buildargs: {
                source_url: `http://localhost:3000/api/v1/jobs/${this.job.id}`,
                source_file: `archive.tar.gz`,
                base_image: `${this.job.language}-1`,
            },
            rm: true,
            networkmode: 'lens_isolated'
        });
        this.buildStream = buildStream;
        return buildStream;
    }
    
    async buildFinished() {
        if (this.buildStream === undefined) return;
        return new Promise((resolve, reject) => {
            if (this.buildStream === undefined) return reject("Build stream is undefined");
            logger.trace(`job ${this.job.id}: waiting for build to complete`);
            docker.modem.followProgress(this.buildStream, (err, res) => {
                if (err !== null || res.length == 0 || res[res.length - 1].error) {
                    reject({
                        error: err || res[res.length - 1].error,
                        stream: res
                    });
                }
                resolve(res);
            }, data => {
                if (data.error) {
                    reject(data);
                }

                if (logger.level !== 'trace') return;
                if (data.stream) {
                    process.stdout.write(data.stream);
                } else {
                    logger.trace(data);
                }
            });
        }).then((result) => {
            logger.trace(`job ${this.job.id}: build completed`);
            delete this.buildStream;
            return result;
        });
    }

    async runTest(test: Test, stream?: NodeJS.WritableStream) {
        if (this.job.id === undefined) throw new Error("Job ID is undefined");
        const ctx = kits.generateContext(this.kit, this.job, test.id);
        const cmdTemplate = this.kit.tests.find(t => t.type === test.type)?.cmd;
        if (!cmdTemplate) throw new Error(`unsupported test type: ${test.type}`);
        const cmd = kits.fillCommands(cmdTemplate, ctx);
        logger.trace(`job ${this.job.id}: running test ${test.id} with command ${cmd}`);
        return docker.run(this.imageTag, cmd, stream ?? process.stdout, {
            HostConfig: {
                Binds: [ 'lens_api_sock:/var/run/lens:ro' ],
                NetworkMode: 'lens_isolated',
                AutoRemove: true
            },
            Labels: {
                'com.autolens.lens.job': this.job.id,
            },
        }).then((out) => {
            logger.trace(`job ${this.job.id}: test ${test.id} completed`);
            return out;
        });
    }
}
