import { z } from "zod";

const FILE_REGEX = /[^<>:"/\\|?*\u0000-\u001F]+/g;
const FILE_PATH = new RegExp(`(/${FILE_REGEX.source})+`);
const BASE64_REGEX = /^[a-zA-Z0-9+/]+={0,2}$/;

export const NoBody = z.object({}).strict();

export const File = z.object({
    path: z.string().regex(FILE_PATH, { message: 'Invalid file path' }),
    content: z.string().regex(BASE64_REGEX, { message: 'Invalid base64 string' }),
});

export type File = z.infer<typeof File>;
export type NoBody = z.infer<typeof NoBody>;
