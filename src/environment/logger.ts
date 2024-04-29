import httpino from 'pino-http';
import pino from 'pino';

const prod = process.env.NODE_ENV === 'production';
const logLevel = prod ? 'info' : 'trace';

const transportOptions = prod ? {} : {
    transport: {
        target: 'pino-pretty'
    }
}

export const httpLogger = httpino({
    level: logLevel,
    useLevel: 'trace',
    ...transportOptions
});

export const logger = pino({
    level: logLevel,
    ...transportOptions
});
