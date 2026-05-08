export class AppError extends Error {
  public statusCode: number;
  public errorCode?: string;

  constructor(statusCode: number, message: string, errorCode?: string) {
    super(message);
    this.statusCode = statusCode;
    if (errorCode !== undefined) {
      this.errorCode = errorCode;
    } else if (statusCode >= 500) {
      this.errorCode = 'INTERNAL_SERVER_ERROR';
    } else {
      this.errorCode = 'APP_ERROR';
    }
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this);
  }
}
