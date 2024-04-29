import { z } from "zod";

export const BaseTest = z.object({
    id: z.string(),
    type: z.string(),
    title: z.string()
})

export const Test = z.discriminatedUnion('type', [
    BaseTest.extend({
        type: z.literal('io'),
        in: z.array(z.string()),
        out: z.string()
    }),
    BaseTest.extend({
        type: z.literal('function'),
        function: z.string(),
        params: z.array(z.string()),
        out: z.string(),
    }),
    BaseTest.extend({
        type: z.literal('unit'),
        contents: z.string()
    })
]);

export const TestResult = z.object({
    id: z.string(),
    result: z.enum(['pass', 'fail', 'error']),
    error : z.object({
        message: z.string(),
        type: z.string().optional(),
        detail: z.string().optional(),
    }).optional()
});

export type Test = z.infer<typeof Test>;
export type TestResult = z.infer<typeof TestResult>;
