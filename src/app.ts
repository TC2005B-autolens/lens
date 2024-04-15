import express from 'express';
import cors from 'cors';
import { httpLogger, logger } from './logger';
import assignments from './assignment';
import errorHandler from './errorHandler';
import redis from './redis';

const app = express();
const api = express.Router();
const port = 3000;

api.use(cors());
api.use('/assignments', assignments);

app.use(httpLogger);
app.use(express.json());
app.use('/api/v1', api);

app.get('/ping', (_, res) => {
    res.send('pong');
});

app.use((_, res) => {
    res.status(404).send({
        status: 404,
        message: 'Not Found'
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
