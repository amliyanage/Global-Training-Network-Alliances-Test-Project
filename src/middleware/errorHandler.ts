import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../utils/errors';
import { logger } from '../config/logger';
import { env } from '../config/env';

const getErrorResponseBase = (req: Request) => ({
  status: 'error' as const,
  requestId: req.requestId,
  path: req.originalUrl,
  timestamp: new Date().toISOString(),
});

export const notFoundHandler = (req: Request, res: Response) => {
  return res.status(404).json({
    ...getErrorResponseBase(req),
    errorCode: 'NOT_FOUND',
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
};

export const errorHandler = (err: unknown, req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof ZodError) {
    logger.warn(
      {
        requestId: req.requestId,
        method: req.method,
        path: req.originalUrl,
        error: err.issues,
      },
      'Validation failed',
    );

    return res.status(400).json({
      ...getErrorResponseBase(req),
      errorCode: 'VALIDATION_ERROR',
      message: 'Validation failed',
      errors: err.issues.map((issue) => ({
        path: issue.path,
        message: issue.message,
      })),
    });
  }

  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      logger.error(
        {
          requestId: req.requestId,
          method: req.method,
          path: req.originalUrl,
          errorCode: err.errorCode,
          err,
        },
        err.message,
      );
    } else {
      logger.warn(
        {
          requestId: req.requestId,
          method: req.method,
          path: req.originalUrl,
          statusCode: err.statusCode,
          errorCode: err.errorCode,
          message: err.message,
        },
        'Request failed',
      );
    }

    return res.status(err.statusCode).json({
      ...getErrorResponseBase(req),
      errorCode: err.errorCode,
      message: err.message,
    });
  }

  const unexpected = err as Error;
  logger.error(
    {
      requestId: req.requestId,
      method: req.method,
      path: req.originalUrl,
      err,
    },
    'Unhandled error',
  );

  return res.status(500).json({
    ...getErrorResponseBase(req),
    errorCode: 'INTERNAL_SERVER_ERROR',
    message:
      env.NODE_ENV === 'development'
        ? unexpected?.message || 'Internal server error'
        : 'Internal server error',
  });
};
