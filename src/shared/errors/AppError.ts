export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly code: string;

  constructor(message: string, statusCode: number, code?: string, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.code = code || this.getDefaultCodeForStatus(statusCode);

    // Ensure the prototype is properly set
    Object.setPrototypeOf(this, new.target.prototype);

    // Capture stack trace, excluding the constructor call from it
    Error.captureStackTrace(this, this.constructor);
  }

  private getDefaultCodeForStatus(statusCode: number): string {
    switch (statusCode) {
      case 400:
        return 'BAD_REQUEST';
      case 401:
        return 'UNAUTHORIZED';
      case 403:
        return 'FORBIDDEN';
      case 404:
        return 'NOT_FOUND';
      default:
        return 'INTERNAL_SERVER_ERROR';
    }
  }
}

export default AppError;
