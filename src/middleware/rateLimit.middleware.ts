import { rateLimit } from 'express-rate-limit';
import { AppError } from '@shared/errors';
import { Request, Response, NextFunction } from 'express';

interface RateLimitConfig {
  windowMs: number;
  max: number;
  message?: string;
}

export function createRateLimiter(config: RateLimitConfig) {
  return rateLimit({
    windowMs: config.windowMs,
    limit: config.max,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: (req: Request, res: Response, next: NextFunction, _options) => {
      // Calculate remaining seconds until reset
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rateLimitInfo = (req as any).rateLimit;
      const resetTime = rateLimitInfo?.resetTime;
      const retryAfter = resetTime
        ? Math.ceil((resetTime.getTime() - Date.now()) / 1000)
        : Math.ceil(config.windowMs / 1000);

      res.set('Retry-After', String(retryAfter > 0 ? retryAfter : 0));

      const message = config.message || 'Too many requests, please try again later.';
      next(new AppError(message, 429, 'TOO_MANY_REQUESTS'));
    },
  });
}

export const createEntryRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20,
  message: 'Too many submissions, please try again later.',
});

export const helpfulRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 100,
  message: 'Too many helpful marks, please try again later.',
});

export const reportRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20,
  message: 'Too many reports, please try again later.',
});

export const adminLoginRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: 'Too many login attempts, please try again later.',
});
