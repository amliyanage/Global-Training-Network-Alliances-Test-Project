import cors, { CorsOptions } from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { env, getCorsOrigins } from '../config/env';

const allowedOrigins = getCorsOrigins();

const corsOptions: CorsOptions =
  allowedOrigins.length === 1 && allowedOrigins[0] === '*'
    ? { origin: true, credentials: true }
    : {
        origin: (origin, callback) => {
          if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
            return;
          }

          callback(new Error('CORS origin not allowed'));
        },
        credentials: true,
      };

export const corsMiddleware = cors(corsOptions);

export const helmetMiddleware = helmet();

export const rateLimitMiddleware = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      status: 'error',
      errorCode: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests. Please try again later.',
      requestId: req.requestId,
      path: req.originalUrl,
      timestamp: new Date().toISOString(),
    });
  },
});
