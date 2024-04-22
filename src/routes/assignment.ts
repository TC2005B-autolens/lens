import express from 'express';
import { logger } from '../logger';
import redis from '../redis';
import { nanoid } from 'nanoid';
import type { APIRoute, APIRouter } from '../routes';
import createHttpError from 'http-errors';
import { AssignmentSchema } from '../models/assignment';
import { NoBody } from '../models/common';

const createAssignment: APIRoute = {
    path: '/',
    post: async (req, res, next) => {
        const data = AssignmentSchema.parse(req.body);
        const id = nanoid();
        // TODO: validate data using JSON schema
        await redis.json.set(`assignment:${id}`, '$', data, { NX: true });
        logger.debug('Created new assignment');
        res.status(201).json({id, ...data});
    }
}

const getAssignment: APIRoute = {
    path: '/:id',
    get: async (req, res, next) => {
        let id = req.params.id;
        const data = await redis.json.get(`assignment:${id}`);
        if (data) {
            res.send(data);
        } else {
            next(new createHttpError.NotFound())
        }
    },
    delete: async (req, res, next) => {
        NoBody.parse(req.body);
        let id = req.params.id;
        const data = await redis.json.del(`assignment:${id}`);
        if (data) {
            res.status(204);
        } else {
            next(new createHttpError.NotFound())
        }
    }
}

const assignmentRoute: APIRouter = {
    path: '/assignments',
    routes: [createAssignment, getAssignment]
}

export default assignmentRoute;
