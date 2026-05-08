import type { IUser } from '../models/User';

declare global {
  namespace Express {
    interface Request {
      user?: IUser;
      rawBody?: string;
      requestId?: string;
      requestStartTime?: bigint;
    }
  }
}

export {};
