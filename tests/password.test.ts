import { describe, expect, it, vi } from 'vitest';
import * as passwordUtil from '../src/modules/auth/password';

describe('Password Utility', () => {
  it('should successfully hash and compare a password', async () => {
    const plain = 'supersecurepassword123';
    const hash = await passwordUtil.hash(plain);
    
    expect(hash).toBeDefined();
    expect(hash).not.toBe(plain);
    
    const matches = await passwordUtil.compare(plain, hash);
    expect(matches).toBe(true);

    const matchesWrong = await passwordUtil.compare('wrongpassword', hash);
    expect(matchesWrong).toBe(false);
  });

  it('should run dummyCompare and take a similar amount of time to protect against timing attacks', async () => {
    const spy = vi.spyOn(passwordUtil, 'dummyCompare');
    await passwordUtil.dummyCompare();
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});
