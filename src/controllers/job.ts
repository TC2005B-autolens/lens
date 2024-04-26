import type { Request, Response, NextFunction } from "express";
import createHttpError from "http-errors";
import redis from "../environment/redis";
import { logger } from "../environment/logger";

export const get_tar = async (req: Request, res: Response, next: NextFunction) => {
    const jobid = req.params.jobid;
    const tarid = req.params.tarid;
    const data = await redis.get(
        redis.commandOptions({ returnBuffers: true }),
        `job:${jobid}:tar`
    );
    const id = await redis.get(`job:${jobid}:tar:id`);
    if (data && id === tarid) {
        res.setHeader('Content-Type', 'application/x-tar');
        res.setHeader('Content-Disposition', `attachment; filename="${jobid}.tar.gz"`);
        res.status(200).end(data);
    } else {
        if (data) {
            logger.debug(`job ${jobid}: tar id mismatch: ${id} != ${tarid}`);
        }
        next(new createHttpError.NotFound());
    }
}
