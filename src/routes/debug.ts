import redis from "../redis";
import type { APIRoute, APIRouter } from "../routes";

const promiseRejection: APIRoute = {
    path: '/error/promise-reject',
    get: async () => {
        await Promise.reject(new Error('Promise rejection test'));   
    }
}

const flushRedis: APIRoute = {
    path: '/flushall',
    get: async (_, res) => {
        await redis.flushAll();
        res.status(204).end();
    }
}

const debugRoute: APIRouter = {
    path: '/debug',
    routes: [promiseRejection, flushRedis]
}

export default debugRoute;
