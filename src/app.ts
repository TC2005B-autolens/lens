import express from 'express';
import 'express-async-errors';
import cors from 'cors';
import api from './routes';
import { logger } from './environment/logger';
import redis from './environment/redis';
import { errorHandler, zodErrorHandler } from './middlewares/error-handler';
import createHttpError from 'http-errors';

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());
app.use('/api/v1', api);

app.use(zodErrorHandler);
app.use(errorHandler);

app.use((_req, res) => {
    res.status(404).json({
        "message": "Not Found"
    });
});

const server = app.listen(port, () => {
    logger.info(`Server is running on port ${port}`);
});

server.on('error', (err) => {
    logger.error('Express server error: ', err);
});

process.on('SIGTERM', () => {
    logger.debug('SIGTERM signal received');
    server.close(() => {
        logger.debug('Express server closed');
    });
    redis.quit();
});
