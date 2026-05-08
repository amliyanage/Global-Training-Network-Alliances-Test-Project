import pino from 'pino';
import { env } from './env';

export const logger = pino({
  name: 'mentecart-backend',
  level: env.LOG_LEVEL,
  timestamp: pino.stdTimeFunctions.isoTime,
  redact: {
    paths: [
      'req.headers.authorization',
      'req.body.password',
      'req.body.passwordPlain',
      'response.body.token',
    ],
    censor: '[REDACTED]',
  },
  base: {
    env: env.NODE_ENV,
  },
});
