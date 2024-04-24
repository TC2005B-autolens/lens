import type { Request, Response, NextFunction } from 'express';
import { HttpError } from 'http-errors';
import { logger } from '../logger';
import { ZodError } from 'zod';

const prod = process.env.NODE_ENV === 'production';

export function zodErrorHandler(err: ZodError, req: Request, res: Response, next: NextFunction) {
    if (!(err instanceof ZodError)) {
        next(err);
        return;
    }
    res.status(400).json({
        message: 'Invalid Request Body',
        errors: err.errors
    });
}

// TODO: Handle Zod body parse errors
export function errorHandler(err: Error | HttpError, req: Request, res: Response, next: NextFunction) {
    const status = (err instanceof HttpError) ? err.statusCode : 500;
    const isServerError = status >= 500; 
    const message = prod ? (isServerError ? 'Internal Server Error' : err.message) : err.message;
    const data = (err as HttpError).data || { err };
    const output = {
        message,
        ...data
    };
    logger.error(`Error while handling ${req.path}: ${message}`);
    res.status(status).json(output);
    next();
}
