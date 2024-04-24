import createHttpError from "http-errors";
import redis from "../redis";
import type { APIRoute, APIRouter } from "../routes";

const routes: APIRoute[] = [
    {
        path: '/:jobid/:tarid.tar.gz',
        get: async (req, res, next) => {
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
                next(new createHttpError.NotFound());
            }
        }
    }
]

const router: APIRouter = {
    path: '/jobs',
    routes
}

export default router;
