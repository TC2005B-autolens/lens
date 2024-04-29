import { z } from 'zod';
import { Assignment, BaseAssignment } from './assignment';
import { NanoID } from './common';
import { TestResult } from './test';

export const JobStatus = z.discriminatedUnion('status', [
    z.object({
        status: z.literal('pending')
    }),
    z.object({
        status: z.literal('building')
    }),
    z.object({
        status: z.literal('testing'),
        tests: z.record(z.string(), z.enum(['pass', 'fail', 'running', 'error']))
    }),
    z.object({
        status: z.literal('completed')
    }),
    z.object({
        status: z.literal('failed'),
        error: z.string()
    })
]);

export const BaseJob = z.object({
    id: NanoID,
    assignment_id: NanoID,
    submission_id: NanoID,
});

export const Job = BaseJob.extend({
    status: JobStatus,
    results: z.record(z.string(), TestResult).optional(),
}).merge(BaseAssignment);

export type BaseJob = z.infer<typeof BaseJob>;
export type Job = z.infer<typeof Job>;

export interface JobProgress {
    status: 'pending' | 'building' | 'testing' | 'completed' | 'failed';
    substage?: string;
    test?: {
        name: string;
        status: 'pass' | 'fail' | 'running' | 'error';
    }
    error?: string;
}