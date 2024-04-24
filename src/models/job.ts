import { z } from 'zod';
import { Assignment } from './assignment';
import { NanoID } from './common';

// TODO: consistency: add id field to all models
export const Job = Assignment.extend({
    id: NanoID,
    assignment_id: NanoID,
    submission_id: NanoID,
    status: z.enum(['pending', 'running', 'completed']),
});

export type Job = z.infer<typeof Job>;
