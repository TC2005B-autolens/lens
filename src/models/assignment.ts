import { z } from "zod";
import { File } from "./common";

export const FilesSchema = z.array(File.extend({
    read: z.boolean(),
    write: z.boolean(),
    main: z.boolean(),
})).nonempty().superRefine((data, ctx) => {
    const mainFiles = data.filter((file: any) => file.main);
    if (mainFiles.length !== 1) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'There must be exactly one main file',
        });
    }

    const filePaths = data.map((file: any) => file.path);
    if (new Set(filePaths).size !== filePaths.length) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Paths must be unique',
        });
    }
});

export const BaseTestSchema = z.object({
    id: z.string(),
    type: z.string(),
    title: z.string()
})

export const TestSchema = z.discriminatedUnion('type', [
    BaseTestSchema.extend({
        type: z.literal("io"),
        in: z.array(z.string()),
        out: z.string()
    }),
    BaseTestSchema.extend({
        type: z.literal("function"),
        function: z.string(),
        // HELP: cómo expeso los parámetros de la función?
        params: z.array(z.string()),
        // HELP: cómo expeso el tipo de retorno de la función?
        out: z.string(),
    }),
    BaseTestSchema.extend({
        type: z.literal("unit"),
        contents: z.string()
    })
]);

export const AssignmentSchema = z.object({
    language: z.string(),
    files: FilesSchema,
    tests: z.array(TestSchema).nonempty(),
});

export type Files = z.infer<typeof FilesSchema>;
export type Test = z.infer<typeof TestSchema>;
export type Assignment = z.infer<typeof AssignmentSchema>;
