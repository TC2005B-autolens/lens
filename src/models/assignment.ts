import { z } from "zod";
import { CodeFile, refineFileList } from "./common";
import { Test } from "./test";

export const AssignmentFiles = z.array(CodeFile.extend({
    write: z.boolean(),
    main: z.boolean().default(false),
})).superRefine(refineFileList).superRefine((data, ctx) => {
    const mainFiles = data.filter((file: any) => file.main);
    if (mainFiles.length !== 1) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'There must be exactly one main file',
        });
    }
});

export const Assignment = z.object({
    id: z.string().optional(),
    language: z.string(),
    files: AssignmentFiles,
    tests: z.array(Test).nonempty().superRefine((data, ctx) => {
        const ids = data.map(t => t.id);
        if (new Set(ids).size !== ids.length) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'Test ids must be unique',
            });
        }
    }),
});

export type AssignmentFiles = z.infer<typeof AssignmentFiles>;
export type Assignment = z.infer<typeof Assignment>;
