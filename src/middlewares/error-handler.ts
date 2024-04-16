import type { Request, Response, NextFunction } from 'express';
import { HttpError } from 'http-errors';
import { logger } from '../logger';

const prod = process.env.NODE_ENV === 'production';

function errorHandler(err: Error | HttpError | any, req: Request, res: Response, next: NextFunction) {
    const status = (err as any).status || (err as HttpError).statusCode || 500;
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

export default errorHandler;
