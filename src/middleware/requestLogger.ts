import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger';

const toDurationMs = (startTime?: bigint): number | undefined => {
  if (!startTime) return undefined;
  const durationNs = process.hrtime.bigint() - startTime;
  return Number(durationNs) / 1_000_000;
};

export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  res.on('finish', () => {
    const durationMs = toDurationMs(req.requestStartTime);
    const logContext = {
      requestId: req.requestId,
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      durationMs,
      ip: req.ip,
      userId: req.user?._id?.toString(),
    };

    if (res.statusCode >= 500) {
      logger.error(logContext, 'Request completed with server error');
      return;
    }

    if (res.statusCode >= 400) {
      logger.warn(logContext, 'Request completed with client error');
      return;
    }

    logger.info(logContext, 'Request completed');
  });

  next();
};
