import { createClient } from "redis";
import { logger } from "./logger";

const redis = createClient({
    url: process.env.REDIS_URL ?? 'redis://localhost:6379'
});

logger.debug(`Redis URL is ${process.env.REDIS_URL}`);
await redis.connect();

redis.on('error', (err) => {
    logger.error('Redis error: ', err);
});

export default redis;
