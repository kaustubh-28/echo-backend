import { Request, Response, NextFunction, Handler } from 'express';
import { AppError } from '@shared/errors';

export const notFoundHandler: Handler = (req: Request, res: Response, next: NextFunction): void => {
  next(new AppError(`Route ${req.method} ${req.originalUrl} not found`, 404));
};

export default notFoundHandler;
