import express from 'express';
import 'express-async-errors';
import cors from 'cors';
import { httpLogger, logger } from './logger';
import assignments from './routes/assignment';
import debuggingRoutes from './routes/debug';
import errorHandler from './middlewares/error-handler';
import redis from './redis';
import { router } from './routes';
import createHttpError from 'http-errors';

const app = express();
const api = express.Router();
const debugRouter = router(debuggingRoutes.routes);
const port = 3000;

debugRouter.use((_, res, next) => {
    if (process.env.NODE_ENV === 'production') {
        next(new createHttpError.NotFound());
    } else {
        next();
    }
});

api.use(cors());
api.use(assignments.path, router(assignments.routes));

app.use(httpLogger);
app.use(express.json());
app.use('/api/v1', api);
app.use(debuggingRoutes.path, debugRouter);

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
