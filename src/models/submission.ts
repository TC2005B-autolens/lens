import { z } from 'zod';
import { CodeFile, refineFileList } from './common';

export const Submission = z.object({
    files: z.array(CodeFile).superRefine(refineFileList),
    assignment: z.string().optional(),
});

export type Submission = z.infer<typeof Submission>;
