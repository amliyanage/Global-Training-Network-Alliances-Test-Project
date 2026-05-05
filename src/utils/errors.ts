export class AppError extends Error {
  public statusCode: number;
  public errorCode?: string;

  constructor(statusCode: number, message: string, errorCode?: string) {
    super(message);
    this.statusCode = statusCode;
    if (errorCode !== undefined) this.errorCode = errorCode;
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this);
  }
}
