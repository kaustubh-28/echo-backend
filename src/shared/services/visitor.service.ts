import { createHash, randomUUID } from 'crypto';
import { Request } from 'express';
import { env } from '@config/env';
import { AnonymousVisitor, VISITOR_COOKIE_NAME } from './visitor.types';

const UUID_V4_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export class VisitorService {
  /**
   * Resolves the anonymous visitor for the current request.
   * Caches the result on `req.visitor` so repeated calls within the same request are stable.
   *
   * TODO: Browser fingerprinting (e.g. FingerprintJS) can later augment cookie-based identity
   * as an additional signal without replacing the signed visitor cookie.
   */
  resolve(req: Request): AnonymousVisitor {
    if (req.visitor) {
      return req.visitor;
    }

    const existingVisitorId = req.signedCookies?.[VISITOR_COOKIE_NAME];

    if (existingVisitorId && this.isValidUuid(existingVisitorId)) {
      const visitor: AnonymousVisitor = {
        visitorId: existingVisitorId,
        visitorHash: this.hashVisitorId(existingVisitorId),
        isNewVisitor: false,
      };
      req.visitor = visitor;
      return visitor;
    }

    const visitorId = randomUUID();
    const visitor: AnonymousVisitor = {
      visitorId,
      visitorHash: this.hashVisitorId(visitorId),
      isNewVisitor: true,
    };
    req.visitor = visitor;
    return visitor;
  }

  hashVisitorId(visitorId: string): string {
    return createHash('sha256')
      .update(`${env.VISITOR_HASH_SALT}:${visitorId}`)
      .digest('hex');
  }

  private isValidUuid(value: string): boolean {
    return UUID_V4_REGEX.test(value);
  }
}

export default VisitorService;
