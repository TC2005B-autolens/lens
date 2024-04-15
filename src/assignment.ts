import express from 'express';

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

export default assignments;
