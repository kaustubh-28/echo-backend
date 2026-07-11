import { NextFunction, Request, RequestHandler, Response } from 'express';
import { ZodTypeAny } from 'zod';

export const validateRequest = (schema: ZodTypeAny): RequestHandler => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const parsed: any = await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });

      if (parsed.body !== undefined) {
        req.body = parsed.body;
      }
      if (parsed.query !== undefined) {
        Object.assign(req.query, parsed.query);
      }
      if (parsed.params !== undefined) {
        Object.assign(req.params, parsed.params);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

export default validateRequest;
