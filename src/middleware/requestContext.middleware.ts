import { Request, Response, NextFunction, RequestHandler } from 'express';
import pino from 'pino';
import { requestContextStore } from '../shared/logger/requestContext';

/**
 * requestContextMiddleware stores req.log (with reqId bound by loggingHandler) in AsyncLocalStorage.
 * This middleware MUST run AFTER loggingHandler in the Express chain so that req.log is populated.
 */
export const requestContextMiddleware: RequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const requestLogger = (req as Request & { log?: pino.Logger }).log;
  if (requestLogger) {
    requestLogger.info(`Request started: ${req.method} ${req.originalUrl || req.url}`);
    if (req.body && Object.keys(req.body).length > 0) {
      requestLogger.info({ body: req.body }, 'Incoming request body');
    }
    if (req.query && Object.keys(req.query).length > 0) {
      requestLogger.info({ query: req.query }, 'Incoming request query params');
    }
    if (req.params && Object.keys(req.params).length > 0) {
      requestLogger.info({ params: req.params }, 'Incoming request path params');
    }

    const originalJson = res.json;
    res.json = function (body: unknown): Response {
      requestLogger.info({ response: body }, 'Response');
      return originalJson.call(this, body);
    };

    requestContextStore.run({ log: requestLogger }, next);
  } else {
    next();
  }
};

export default requestContextMiddleware;
