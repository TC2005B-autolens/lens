import { ZodError, z } from 'zod';
import fs from 'fs';
import { logger } from '../environment/logger';
import { BaseJob, type Job } from '../models/job';
import { Test } from '../models/test';

export const KitManifest = z.object({
    version: z.string(),
    kit: z.object({
        version: z.string(),
        language: z.string()
    }),
    tests: z.array(z.object({
        type: z.enum(['io', 'function', 'unit']),
        cmd: z.array(z.string())
    }))
})
export type KitManifest = z.infer<typeof KitManifest>;

export const KitTestCmdContext = z.object({
    job: BaseJob,
    test: Test,
    kit: KitManifest.shape.kit
});
export type KitTestCmdContext = z.infer<typeof KitTestCmdContext>;

class kitProvider {
    private kits: Map<string, KitManifest> = new Map();

    constructor() {
        const kitFolders = fs.readdirSync('kits');
        kitFolders.forEach(async (folder) => {
            // import uses the path of the current file
            const data = await import(`../../kits/${folder}/manifest.toml`);
            try {
                const manifest = KitManifest.parse(data);
                this.kits.set(manifest.kit.language, manifest);
            } catch (err) {
                if (!(err instanceof ZodError)) throw err;
                logger.error(`invalid kit manifest for ${folder}: ${JSON.stringify(err.errors)}`);
            }
        })
    }

    get(name: string) {
        return this.kits.get(name);
    }

    generateContext(kit: KitManifest, job: Job, testId: string): KitTestCmdContext {
        const test = job.tests.find(t => t.id === testId);
        if (!test) {
            throw new Error(`test ${testId} not found in kit`);
        }
        return {
            job: BaseJob.parse(job),
            test: test,
            kit: kit.kit,
        }
    }

    // Safe eval, as templates are developer defined and built only once
    evalTemplate(template: string, context: KitTestCmdContext) {
        const handler = new Function('vars', [
            `const tagged = (${Object.keys(context).join(', ')}) => \`${template}\`;`,
            `return tagged(...Object.values(vars));`
        ].join('\n'));
        return handler(context);
    }

    fillCommands(template: string[], context: KitTestCmdContext) {
        return template.map((cmd) => this.evalTemplate(cmd, context));
    }
}

const provider = new kitProvider();

export default provider;
