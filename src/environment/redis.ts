import { createClient } from "redis";
import { logger } from "./logger";

export const connection = {
    host: process.env.REDIS_HOST ?? 'localhost',
    port: parseInt(process.env.REDIS_PORT ?? '6379'),
}

const redis = createClient({
    url: `redis://${connection.host}:${connection.port}`,
});

logger.debug(`Redis URL is ${process.env.REDIS_URL}`);
await redis.connect();

redis.on('error', (err) => {
    logger.error('Redis error: ', err);
});

export default redis;
