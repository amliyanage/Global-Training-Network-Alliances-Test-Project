import { Response } from 'express';

export interface ApiSuccessResponse<T> {
  status: 'success';
  message?: string;
  data: T;
  requestId?: string;
  timestamp: string;
}

export const sendSuccess = <T>(res: Response, data: T, statusCode = 200, message?: string) => {
  const response: ApiSuccessResponse<T> = {
    status: 'success',
    data,
    timestamp: new Date().toISOString(),
    requestId: res.req.requestId,
  };

  if (message) {
    response.message = message;
  }

  return res.status(statusCode).json(response);
};
