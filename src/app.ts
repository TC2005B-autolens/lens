import express from 'express';
import 'express-async-errors';
import cors from 'cors';
import api from './routes';
import { logger } from './environment/logger';
import redis from './environment/redis';
import { errorHandler, zodErrorHandler } from './middlewares/error-handler';
import isolatedApp from './isolated_app';
import fs from 'fs';

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

// More info in isolated_app.ts
const isolatedServer = isolatedApp.listen('/var/run/lens/lens.sock', () => {
    logger.info('Opened socket at /var/run/lens/lens.sock');
    fs.chmodSync('/var/run/lens/lens.sock', 0o744);
    logger.debug('Changed socket permissions to 744');
});

server.on('error', (err) => {
    logger.error('Express server error: ', err);
});

process.on('SIGTERM', () => {
    logger.debug('SIGTERM signal received');
    server.close(() => {
        logger.debug('Express server closed');
    });
    isolatedServer.close(() => {
        logger.debug('Unix socket server closed');
    })
    redis.quit();
});
