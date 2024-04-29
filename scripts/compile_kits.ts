import docker from '../src/environment/docker';
import { logger } from '../src/environment/logger';
import fs from 'fs';

for (let kitDir of fs.readdirSync('kits')) {
    const manifest = await import(`../kits/${kitDir}/manifest.toml`);
    if (manifest.version !== "1") throw new Error(`unsupported manifest version: ${manifest.version}`);
    const imageTag = `lenskit:${manifest.kit.language}-${manifest.kit.version}`;
    
    logger.info(`building image ${imageTag}...`);
    const buildStream = await docker.buildImage(`.lens/kits/${manifest.kit.language}.tar.gz`, {
        t: imageTag,
        dockerfile: 'Dockerfile.base',
        rm: true
    });
    try {
        await new Promise((resolve, reject) => {
            docker.modem.followProgress(
                buildStream,
                (err, res) => {
                    if (err !== null || res.length == 0 || res[res.length - 1].error) {
                        reject(err || res[res.length - 1].error);
                        return;
                    }
                    resolve(res);
                }
            );
        });
    } catch (e) {
        logger.error(`error building image ${imageTag}: ${e}`);
    }
}
