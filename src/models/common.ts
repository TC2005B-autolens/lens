import { nanoid } from "nanoid";
import { BRAND, z } from "zod";
import path from "path";
import { logger } from "../logger";

const INVALID_FILE_REGEX = /[<>:"/\\|?*\u0000-\u001F]/g;
const BASE64_REGEX = /^[a-zA-Z0-9+/]+={0,2}$/;

export const NoBody = z.object({}).strict();
export const Base64String = z.string().regex(BASE64_REGEX, { message: 'Invalid base64 string' });
export const NanoID = z.string().length(21).regex(/[A-Za-z0-9_-]/g);

export const CodeFile = z.object({
    path: z.string().min(1).superRefine((value, ctx) => {
        const parsed = path.parse(value);
        const segments = parsed.dir.split(path.sep);
        if (value[value.length - 1] == path.sep) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Path cannot end in a slash' });
        }
        if (parsed.root !== '') {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Path cannot be absolute' });
        }
        if (segments.some(dir => INVALID_FILE_REGEX.test(dir) || dir === '.' || dir === '..')) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Path is invalid.' });
        }
        if (INVALID_FILE_REGEX.test(parsed.base)) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Invalid characters in filename' });
        }
    }),
    content: Base64String,
});

export function refineFileList<T extends z.infer<typeof CodeFile>>(files: T[], ctx: z.RefinementCtx) {
    if (files.length === 0) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'There must exist at least one file' });
    }

    let paths = new Set<string>();
    files.map((f, idx) => {
        let currentPath = f.path;
        for (let parentPath = currentPath; parentPath.length !== 1; parentPath = path.dirname(parentPath)) {
            if (paths.has(parentPath)) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: 'File would overwrite existing file or directory',
                    path: [ idx, 'path' ]
                });
            }
        }
        paths.add(currentPath);
    });
}

export type File = z.infer<typeof CodeFile>;
export type NoBody = z.infer<typeof NoBody>;
