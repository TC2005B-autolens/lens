import { z } from 'zod';
import { File } from './common';

export const Submission = z.object({
    files: z.array(File),
});

export type Submission = z.infer<typeof Submission>;
