import { z } from "zod";
import { CodeFile, refineFileList } from "./common";

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

export const BaseTest = z.object({
    id: z.string(),
    type: z.string(),
    title: z.string()
})

export const Test = z.discriminatedUnion('type', [
    BaseTest.extend({
        type: z.literal("io"),
        in: z.array(z.string()),
        out: z.string()
    }),
    BaseTest.extend({
        type: z.literal("function"),
        function: z.string(),
        // HELP: cómo expeso los parámetros de la función?
        params: z.array(z.string()),
        // HELP: cómo expeso el tipo de retorno de la función?
        out: z.string(),
    }),
    BaseTest.extend({
        type: z.literal("unit"),
        contents: z.string()
    })
]);

export const Assignment = z.object({
    language: z.string(),
    files: AssignmentFiles,
    tests: z.array(Test).nonempty(),
});

export type AssignmentFiles = z.infer<typeof AssignmentFiles>;
export type Test = z.infer<typeof Test>;
export type Assignment = z.infer<typeof Assignment>;
