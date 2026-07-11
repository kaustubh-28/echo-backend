import { ErrorRequestHandler, NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { log } from '@shared/logger/requestContext';
import { AppError } from '@shared/errors';

export const errorHandler: ErrorRequestHandler = (
  err: Error,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction,
): void => {
  // 1. Zod Validation Error
  if (err instanceof ZodError) {
    const formattedIssues = err.issues.map((e) => ({
      path: e.path.join('.'),
      message: e.message,
    }));

    const detailsStr = formattedIssues.map((i) => `${i.path}: ${i.message}`).join('\n');
    log.warn(
      `Validation Error\n${req.method} ${req.originalUrl || req.url}\nValidation failed\n${detailsStr}`,
    );

    res.status(400).json({
      success: false,
      data: null,
      meta: {},
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: formattedIssues,
      },
    });
    return;
  }

  // 2. Operational AppError
  if (err instanceof AppError && err.isOperational) {
    log.warn(
      `Operational Error\n${req.method} ${req.originalUrl || req.url}\n${err.code}: ${err.message}`,
    );

    res.status(err.statusCode).json({
      success: false,
      data: null,
      meta: {},
      error: {
        code: err.code,
        message: err.message,
      },
    });
    return;
  }

  // 3. Unexpected System Error (Internal Server Error)
  log.error(
    err,
    `Unhandled Error\n${req.method} ${req.originalUrl || req.url}\n${err.name}: ${err.message}`,
  );

  res.status(500).json({
    success: false,
    data: null,
    meta: {},
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Internal Server Error',
    },
  });
};

export default errorHandler;
