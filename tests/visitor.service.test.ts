import { createHash } from 'crypto';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { Request } from 'express';
import { VisitorService } from '../src/shared/services/visitor.service';
import { VISITOR_COOKIE_NAME } from '../src/shared/services/visitor.types';

vi.mock('../src/config/env', () => ({
  env: {
    VISITOR_HASH_SALT: 'test-visitor-hash-salt',
    NODE_ENV: 'test',
  },
}));

describe('VisitorService', () => {
  const service = new VisitorService();

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should generate a new visitor when no cookie is present', () => {
    const req = { signedCookies: {} } as Request;

    const visitor = service.resolve(req);

    expect(visitor.isNewVisitor).toBe(true);
    expect(visitor.visitorId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    expect(visitor.visitorHash).toHaveLength(64);
    expect(req.visitor).toEqual(visitor);
  });

  it('should reuse an existing signed cookie visitorId', () => {
    const visitorId = 'a1b2c3d4-e5f6-4789-a012-3456789abcde';
    const req = {
      signedCookies: {
        [VISITOR_COOKIE_NAME]: visitorId,
      },
    } as unknown as Request;

    const visitor = service.resolve(req);

    expect(visitor.isNewVisitor).toBe(false);
    expect(visitor.visitorId).toBe(visitorId);
    expect(visitor.visitorHash).toBe(service.hashVisitorId(visitorId));
  });

  it('should return the same visitor when resolve is called twice on one request', () => {
    const visitorId = 'a1b2c3d4-e5f6-4789-a012-3456789abcde';
    const req = {
      signedCookies: {
        [VISITOR_COOKIE_NAME]: visitorId,
      },
    } as unknown as Request;

    const first = service.resolve(req);
    const second = service.resolve(req);

    expect(first).toBe(second);
  });

  it('should generate visitorHash deterministically for the same visitorId', () => {
    const visitorId = 'a1b2c3d4-e5f6-4789-a012-3456789abcde';

    const hashOne = service.hashVisitorId(visitorId);
    const hashTwo = service.hashVisitorId(visitorId);

    expect(hashOne).toBe(hashTwo);
    expect(hashOne).toBe(
      createHash('sha256').update(`test-visitor-hash-salt:${visitorId}`).digest('hex'),
    );
  });

  it('should generate different visitorHashes for different visitorIds', () => {
    const hashOne = service.hashVisitorId('a1b2c3d4-e5f6-4789-a012-3456789abcde');
    const hashTwo = service.hashVisitorId('b2c3d4e5-f6a7-4890-b123-456789abcdef0');

    expect(hashOne).not.toBe(hashTwo);
  });

  it('should ignore invalid cookie values and issue a new visitor', () => {
    const req = {
      signedCookies: {
        [VISITOR_COOKIE_NAME]: 'not-a-valid-uuid',
      },
    } as unknown as Request;

    const visitor = service.resolve(req);

    expect(visitor.isNewVisitor).toBe(true);
    expect(visitor.visitorId).not.toBe('not-a-valid-uuid');
  });
});
