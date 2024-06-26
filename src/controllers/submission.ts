import type { Request, Response, NextFunction, RequestHandler } from "express";
import type { Assignment } from "../models/assignment";
import { Submission } from "../models/submission";
import createHttpError from "http-errors";
import redis from "../environment/redis";
import { nanoid } from "nanoid";
import * as lensService from "../lens/service";

declare module "express-serve-static-core" {
    interface Request {
        submission?: Submission;
    }
}

export const provide: RequestHandler = async (req: Request, res: Response, next: NextFunction) => {
    const id = req.params.submission_id;
    const data = await redis.json.get(`submission:${id}`);
    if (data) {
        const submission = Submission.parse(data);
        req.submission = submission;
        next();
    } else {
        next(new createHttpError.NotFound('Submission does not exist'));
    }
}

export const create: RequestHandler = async (req: Request, res: Response, next: NextFunction) => {
    if (!req.assignment) {
        throw new Error('Assignment should be provided');
    }
    const id = nanoid();
    const assignment = req.assignment;
    const submission = Submission.parse(req.body);
    
    try {
        const lensJob = lensService.create({ ...submission, id }, { ...assignment, id });
        await redis.json.set(`submission:${id}`, '$', submission, { NX: true });
        const job = await lensService.dispatch(lensJob);
        res.status(201).json({ id, job: lensJob });
    } catch (e) {
        if (!(e instanceof lensService.invalidSubmissionError)) throw e;
        throw new createHttpError.BadRequest(e.message);
    }
}

export const get = async (req: Request, res: Response) => {
    res.send(req.submission);
}

export const del = async (req: Request, res: Response) => {
    await redis.json.del(`submission:${req.params.submission_id}`);
    res.status(204).send();
}
