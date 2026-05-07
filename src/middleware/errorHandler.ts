import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../utils/errors';

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof ZodError) {
    console.warn(`[Warn] ${req.method} ${req.path}: validation failed`);
    return res.status(400).json({
      status: 'error',
      message: 'Validation failed',
      errors: err.issues.map((e: any) => ({
        path: e.path,
        message: e.message,
      })),
    });
  }

  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      console.error(`[Error] ${req.method} ${req.path}:`, err);
    } else {
      const code = err.errorCode || 'APP_ERROR';
      console.warn(`[Warn] ${req.method} ${req.path}: ${err.statusCode} ${code} - ${err.message}`);
    }

    return res.status(err.statusCode).json({
      status: 'error',
      errorCode: err.errorCode,
      message: err.message,
    });
  }

  console.error(`[Error] ${req.method} ${req.path}:`, err);
  res.status(500).json({
    status: 'error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error',
  });
};
