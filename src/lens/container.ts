import type { Job } from "../models/job";
import docker from "../environment/docker";
import { logger } from "../environment/logger";
import type { KitManifest } from "./kit";
import kits from './kit';
import type { Test } from "../models/test";

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
        return await new Promise((resolve, reject) => {
            if (this.buildStream === undefined) return reject("Build stream is undefined");
            docker.modem.followProgress(this.buildStream, this.handleBuildFinish);
        });
    }

    async runTest(test: Test) {
        const ctx = kits.generateContext(this.kit, this.job, test.id);
        const cmdTemplate = this.kit.tests.find(t => t.type === test.type)?.cmd;
        if (!cmdTemplate) throw new Error(`unsupported test type: ${test.type}`);
        const cmd = kits.fillCommands(cmdTemplate, ctx);
        logger.trace(`job ${this.job.id}: running test ${test.id} with command ${cmd}`);
        if (test.type === 'function') {
            return this.runFunctionTest(test, cmd);
        }
        throw new Error(`unsupported test type: ${test.type}`);
    }

    async runFunctionTest(test: Test, cmd: string[]) {
        return docker.run(this.imageTag, cmd, process.stdout, {
            HostConfig: {
                Binds: [ 'lens_api_sock:/var/run/lens:ro' ],
                NetworkMode: 'lens_isolated'
            }
        }).then((out) => {
            logger.trace(`job ${this.job.id}: test ${test.id} completed`);
            return out;
        });
    }

    private handleBuildFinish(err: Error | null, res: any) {
        delete this.buildStream;
        if (err !== null || res.length == 0 || res[res.length - 1].error) {
            return {
                error: err || res[res.length - 1].error,
                stream: res
            };
        }
        return res;
    }
}
