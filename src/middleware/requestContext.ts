import { randomUUID } from 'crypto';
import { Request, Response, NextFunction } from 'express';

export const attachRequestContext = (req: Request, res: Response, next: NextFunction) => {
  const incomingRequestId = req.header('x-request-id');
  const requestId = incomingRequestId && incomingRequestId.trim().length > 0 ? incomingRequestId : randomUUID();

  req.requestId = requestId;
  req.requestStartTime = process.hrtime.bigint();
  res.setHeader('x-request-id', requestId);

  next();
};
