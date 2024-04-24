import createHttpError from "http-errors";
import redis from "../redis";
import docker from "../docker";
import type { APIRoute, APIRouter } from "../routes";
import { z } from "zod";
import { refineFileList, CodeFile } from "../models/common";

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

const dockerInfo: APIRoute = {
    path: '/docker/info',
    get: async (_, res) => {
        const info = await docker.info();
        res.status(200).json(info);
    }
}

const testFilesValidation: APIRoute = {
    path: '/test/files-validation',
    post: async (req, res) => {
        const data = z.array(CodeFile).superRefine(refineFileList).parse(req.body);
        res.status(200).json(data);
    }
}

const debugRoute: APIRouter = {
    path: '/debug',
    routes: [promiseRejection, flushRedis, dockerInfo, testFilesValidation],
    middlewares: [
        (_, res, next) => {
            if (process.env.NODE_ENV === 'production') {
                next(new createHttpError.NotFound());
            } else {
                next();
            }
        }
    ]
}

export default debugRoute;
