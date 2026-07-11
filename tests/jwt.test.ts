import { describe, expect, it } from 'vitest';
import * as jwtUtil from '../src/modules/auth/jwt';

describe('JWT Utility', () => {
  it('should generate a signed token and verify it correctly', () => {
    const payload = {
      sub: 'admin-id-123',
      username: 'admin',
    };

    const token = jwtUtil.generate(payload);
    expect(token).toBeDefined();

    const decoded = jwtUtil.verify(token);
    expect(decoded.sub).toBe(payload.sub);
    expect(decoded.username).toBe(payload.username);
    expect(decoded.role).toBe('admin');
  });

  it('should throw an error for invalid token signatures', () => {
    expect(() => jwtUtil.verify('invalid.token.here')).toThrow();
  });
});
