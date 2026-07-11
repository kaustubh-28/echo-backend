import { describe, expect, it } from 'vitest';
import request from 'supertest';
import express from 'express';
import { createRateLimiter } from '../src/middleware/rateLimit.middleware';
import { errorHandler } from '../src/middleware/error.middleware';

describe('Rate Limiting Middleware', () => {
  it('should enforce limit, set Retry-After header, and return proper AppError format', async () => {
    const app = express();
    
    // Create a rate limiter with a limit of 2 requests
    const limiter = createRateLimiter({
      windowMs: 10 * 1000, // 10 seconds
      max: 2,
      message: 'Too many test requests.',
    });

    app.get('/test-limit', limiter, (req, res) => {
      res.status(200).json({ success: true });
    });

    app.use(errorHandler);

    // 1st request - allowed
    const res1 = await request(app).get('/test-limit');
    expect(res1.status).toBe(200);

    // 2nd request - allowed
    const res2 = await request(app).get('/test-limit');
    expect(res2.status).toBe(200);

    // 3rd request - blocked
    const res3 = await request(app).get('/test-limit');
    expect(res3.status).toBe(429);
    expect(res3.headers['retry-after']).toBeDefined();
    expect(Number(res3.headers['retry-after'])).toBeGreaterThan(0);
    expect(res3.body).toEqual({
      success: false,
      data: null,
      meta: {},
      error: {
        code: 'TOO_MANY_REQUESTS',
        message: 'Too many test requests.',
      },
    });
  });
});
