import express from 'express';
import { logger } from '../logger';
import redis from '../redis';
import { nanoid } from 'nanoid';
import type { APIRoute, APIRouter } from '../routes';
import createHttpError from 'http-errors';

/**
 * Assignment
 * 
 * Represents an individual assignment.
 * It can be written in a single language, and contain multiple files.
 * Each assignment has a set of tests that are run against submissions.
 */
export interface Assignment {
    id: string;
    language: string;
    files: File[];
    tests: Test[];
}

/**
 * Assignments can contain multiple files which are described using the File interface.
 * The file permissions determine whether student's code can read or write the files.
 */
export interface File {
    /** The path of the file. Cannot include ../ */
    path: string;
    content: string;
    /** Whether the file will be visible by the student. */
    visible: boolean;
    /** Whether the file can be written to by the student. */
    writeable: boolean;
}

/**
 * A test represents a set of actions, or steps, run against a submission.
 * An action can give data to the program, or do assertions, which check the output of the program.
 */
export interface Test {
    id: string;
    title: string;
    actions: Action[];
}

/**
 * An Action represents an individual step in a test.
 */
export type Action =
    | { type: string; [key: string]: any }
    | { type: 'assert'; assert: Assertion };

/** 
 * An assertion is an individual condition that must be met for a test
 * to be passed. Any assertion failure will cause the entire test to fail.
*/
export type Assertion = {
    type: string;
    description?: string;
    [key: string]: any;
}

const createAssignment: APIRoute = {
    path: '/',
    post: async (req, res, next) => {
        const data = req.body;
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
        let id = req.params.id;
        const data = await redis.json.del(`assignment:${id}`);
        if (data) {
            res.status(204).end();
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
