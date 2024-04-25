import type { Request, Response, NextFunction, RequestHandler } from "express";
import { Assignment } from "../models/assignment";
import redis from "../environment/redis";
import createHttpError from "http-errors";
import { nanoid } from "nanoid";

declare module "express-serve-static-core" {
    interface Request {
        assignment?: Assignment;
    }
}

export const provide: RequestHandler = async (req: Request, res: Response, next: NextFunction) => {
    let id = req.params.assignment_id;
    const data = await redis.json.get(`assignment:${id}`);
    if (data) {
        const assignment = Assignment.parse(data);
        req.assignment = assignment;
        next();
    } else {
        next(new createHttpError.NotFound('Assignment does not exist'));
    }
}

export const get = async (req: Request, res: Response) => {
    res.send(req.assignment);
}

export const del = async (req: Request, res: Response) => {
    await redis.json.del(`assignment:${req.params.assignment_id}`);
    res.status(204).send();
}

export const create = async (req: Request, res: Response, next: NextFunction) => {
    const data = Assignment.parse(req.body);
    const id = nanoid();
    await redis.json.set(`assignment:${id}`, '$', data, { NX: true });
    res.status(201).json({ id, ...data });
}


