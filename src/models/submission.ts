import { z } from 'zod';
import { CodeFile, refineFileList } from './common';

export const Submission = z.object({
    id: z.string().optional(),
    files: z.array(CodeFile).superRefine(refineFileList),
});

export type Submission = z.infer<typeof Submission>;
