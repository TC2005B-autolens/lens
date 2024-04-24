import { nanoid } from "nanoid";
import { Submission } from "../models/submission";
import type { APIRoute, APIRouter } from "../routes";
import redis from "../redis";
import createHttpError from "http-errors";
import { Assignment } from "../models/assignment";
import gradingJob from "../grader";
import { logger } from "../logger";

const routes: APIRoute[] = [
    {
        path: '/',
        post: async (req, res, next) => {
            const submission = Submission.parse(req.body);
            const id = nanoid();
            const assignmentId = req.params.asid;

            const assignment = await redis.json.get(`assignment:${assignmentId}`) as Assignment | null;
            if (!assignment) {
                next(new createHttpError.NotFound(`Assignment ${assignmentId} not found`));
                return;
            }
            for (let file of submission.files) {
                let assignmentFile = assignment.files.find(f => f.path === file.path);
                if (assignmentFile && !(assignmentFile.read && assignmentFile.write)) {
                    next(new createHttpError.BadRequest(`File ${file.path} is not allowed to be submitted`));
                }
            }
            const fullSubmission = { 
                ...submission,
                id,
                assignment: assignmentId
            };
            await redis.json.set(`submission:${id}`, '$', fullSubmission, { NX: true });
            const job = await gradingJob.dispatch(fullSubmission);
            res.status(201).json({ id, job });
        }
    },
    {
        path: '/:id',
        get: async (req, res, next) => {
            const id = req.params.id;
            const data = await redis.json.get(`submission:${id}`);
            if (data) {
                res.send(data);
            } else {
                next(new createHttpError.NotFound());
            }
        },
        delete: async (req, res, next) => {
            const id = req.params.id;
            const data = await redis.json.del(`submission:${id}`);
            if (data) {
                res.status(204);
            } else {
                next(new createHttpError.NotFound());
            }
        }
    }
]



const router: APIRouter = {
    path: '/assignments/:asid/submissions',
    routes
}

export default router;
