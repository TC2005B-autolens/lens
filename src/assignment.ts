import express from 'express';
import { logger } from './logger';
import redis from './redis';
import { nanoid } from 'nanoid';

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
 * A test represents a set of actions, or steps, run against a submission.
 * An action can give data to the program, or do assertions, which check the output of the program.
 */
export interface Test {
    id: string;
    title: string;
    actions: Action[];
}

/**
 * Assignments can contain multiple files which are described using the File interface.
 * The file permissions determine whether student's code can read or write the files.
 */
export interface File {
    path: string;
    content: string;
    read: boolean;
    write: boolean;
}

/**
 * An Action represents an individual step in a test.
 */
export interface Action {
    type: string;
}

const assignments = express.Router();

assignments.post('/', (req, res) => {
    let data = req.body;
    let id = nanoid();
    // TODO: validate data using JSON schema
    redis.json.set(`assignment:${id}`, '$', data);
    logger.debug('Created new assignment');
    res.status(201).send({
        status: 201,
        message: 'Created',
        id: id
    });
});

assignments.get('/:id', async (req, res) => {
    let id = req.params.id;
    const data = await redis.json.get(`assignment:${id}`);
    if (data) {
        res.send(data);
    } else {
        res.status(404).send({
            status: 404,
            message: 'Not Found'
        });
    }
});

export default assignments;
