import { Response } from 'express';

interface SuccessResponseOptions<T> {
  res: Response;
  statusCode?: number;
  data: T;
  meta?: Record<string, unknown>;
}

export function sendSuccessResponse<T>({
  res,
  statusCode = 200,
  data,
  meta = {},
}: SuccessResponseOptions<T>): void {
  res.status(statusCode).json({
    success: true,
    data,
    meta,
    error: null,
  });
}
