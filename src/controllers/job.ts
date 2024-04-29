import type { Request, Response, NextFunction } from "express";
import createHttpError from "http-errors";
import redis from "../environment/redis";
import { logger } from "../environment/logger";
import { Job } from "../models/job";
import { TestResult } from "../models/test";

declare module "express-serve-static-core" {
    interface Request {
        job?: Job;
    }
}

export const getArchive = async (req: Request, res: Response, next: NextFunction) => {
    const jobid = req.params.jobid;
    const data = await redis.get(
        redis.commandOptions({ returnBuffers: true }),
        `job:${jobid}:tar`
    );
    if (data) {
        res.setHeader('Content-Type', 'application/x-tar');
        res.setHeader('Content-Disposition', `attachment; filename="${jobid}.tar.gz"`);
        res.status(200).end(data);
    } else {
        next(new createHttpError.NotFound());
    }
}

export const provide = async (req: Request, res: Response, next: NextFunction) => {
    const jobid = req.params.jobid;
    try {
        const data = await redis.json.get(`job:${jobid}`);
        if (data) {
            req.job = Job.parse(data);
            next();
        } else {
            next(new createHttpError.NotFound());
        }
    } catch (e) {
        logger.error(`Error parsing job ${jobid}: ${e}`);
        throw new createHttpError.InternalServerError();
    }   
}

export const get = async (req: Request, res: Response) => {
    res.send(req.job);
}

export const postResult = async (req: Request, res: Response) => {
    const testId = req.query.test;
    if (!testId) {
        throw new createHttpError.BadRequest('test query parameter is required');
    }
    const job = req.job as Job;
    const result = TestResult.parse(req.body);
    logger.debug(`job ${job.id} test ${testId} result: ${result.result}`);
    await redis.json.set(`job:${job.id}`, `$.results`, {}, { NX: true });
    await redis.json.set(`job:${job.id}`, `$.results.${testId}`, result);
    res.status(201).send();
}
