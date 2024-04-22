import express from 'express';
import 'express-async-errors';
import cors from 'cors';
import { httpLogger, logger } from './logger';
import assignments from './routes/assignment';
import debuggingRoutes from './routes/debug';
import { errorHandler, zodErrorHandler } from './middlewares/error-handler';
import redis from './redis';
import { router } from './routes';

const app = express();
const api = express.Router();
const port = 3000;

api.use(cors());
api.use(assignments.path, router(assignments));

app.use(httpLogger);
app.use(express.json());
app.use('/api/v1', api);
app.use(debuggingRoutes.path, router(debuggingRoutes));

app.get('/ping', (_, res) => {
    res.send('pong');
});
app.all('/ping', (_, res) => {
    res.status(405).end();
});

app.use((_, res) => {
    res.status(404).json({
        error: 'NotFound',
        message: 'The requested resource was not found'
    });
});

app.use(zodErrorHandler);
app.use(errorHandler);

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
