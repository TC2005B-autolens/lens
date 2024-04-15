import type { Request, Response, NextFunction } from 'express';

function isHttpError(error: number) {
    return error >= 400 && error < 600;
}

// Express.js middleware to handle errors
interface ErrorHandler {
    (err: Error, req: Request, res: Response, next: NextFunction): void;
}

const errorHandler: ErrorHandler = (err, req, res, next) => {
    res.json({
        status: 500,
        message: err.message,
        stack: (process.env.NODE_ENV === 'production') ? '🥞' : err.stack
    });
};

export default errorHandler;
