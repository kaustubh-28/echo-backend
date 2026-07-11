import { RequestHandler } from 'express';
import { env } from '@config/env';
import { VisitorService } from '@shared/services/visitor.service';
import { VISITOR_COOKIE_MAX_AGE_MS, VISITOR_COOKIE_NAME } from '@shared/services/visitor.types';

export function createVisitorCookieMiddleware(visitorService: VisitorService): RequestHandler {
  return (req, res, next): void => {
    const visitor = visitorService.resolve(req);

    if (visitor.isNewVisitor) {
      res.cookie(VISITOR_COOKIE_NAME, visitor.visitorId, {
        httpOnly: true,
        signed: true,
        sameSite: 'lax',
        secure: env.NODE_ENV === 'production',
        maxAge: VISITOR_COOKIE_MAX_AGE_MS,
      });
    }

    next();
  };
}

export default createVisitorCookieMiddleware;
