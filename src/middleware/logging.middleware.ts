import crypto from 'crypto';
import { IncomingMessage, ServerResponse } from 'http';
import pinoHttp from 'pino-http';
import { logger } from '@shared/logger';
import { env } from '@config/env';

const isDevelopment = env.NODE_ENV === 'development';

export const loggingHandler = pinoHttp({
  logger,
  customAttributeKeys: {
    reqId: 'uuid',
  },
  genReqId(req, res) {
    const existingId = req.headers['x-request-id'];
    const id = (Array.isArray(existingId) ? existingId[0] : existingId) || crypto.randomUUID();
    if (res) {
      (res as ServerResponse).setHeader('X-Request-Id', id);
    }
    return id;
  },
  customSuccessMessage(req, res, responseTime) {
    const url = (req as IncomingMessage & { originalUrl?: string }).originalUrl || req.url || '';
    return `Request ended: ${req.method} ${url} - Status ${res.statusCode} - Duration ${responseTime}ms`;
  },
  customErrorMessage(req, res, err) {
    const url = (req as IncomingMessage & { originalUrl?: string }).originalUrl || req.url || '';
    return `Request ended with error: ${req.method} ${url} - Status ${res.statusCode} - Error: ${err.message}`;
  },
  // Suppress default req/res serialization blocks in dev to avoid log bloat, while keeping structured logs in prod
  serializers: {
    req: isDevelopment
      ? () => undefined
      : (req) => ({
          method: req.method,
          url: (req as IncomingMessage & { originalUrl?: string }).originalUrl || req.url || '',
        }),
    res: isDevelopment
      ? () => undefined
      : (res) => ({
          statusCode: res.statusCode,
        }),
  },
});

export default loggingHandler;
