import express from 'express';
import redis from 'redis';
import cors from 'cors';
import { httpLogger, logger } from './logger';

const app = express();
const api = express.Router();
const port = 3000;

api.use(cors());
api.get('/', (req, res) => {
    res.send('Hello World!');
});

app.use(httpLogger);
app.use(express.json());
app.use('/api', api);

app.listen(port, () => {
    logger.info(`Server is running on port ${port}`);
});
