import { describe, expect, it, vi, beforeEach } from 'vitest';
import { AuthService } from '../src/modules/auth/auth.service';
import * as passwordUtil from '../src/modules/auth/password';

const mockAdminRepository = {
  findById: vi.fn(),
  findByUsername: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  incrementFailedAttempts: vi.fn(),
  resetFailedAttempts: vi.fn(),
  updatePassword: vi.fn(),
  updateLoginMetadata: vi.fn(),
};

describe('AuthService Unit Tests', () => {
  let authService: AuthService;

  beforeEach(() => {
    vi.clearAllMocks();
    authService = new AuthService(mockAdminRepository as any);
  });

  it('should log in successfully with correct credentials', async () => {
    const passwordHash = await passwordUtil.hash('admin1234');
    const adminDoc = {
      id: 'admin-id-123',
      username: 'admin',
      passwordHash,
      isActive: true,
      failedLoginAttempts: 0,
      lockUntil: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockAdminRepository.findByUsername.mockResolvedValue(adminDoc);
    mockAdminRepository.resetFailedAttempts.mockResolvedValue(adminDoc);
    mockAdminRepository.updateLoginMetadata.mockResolvedValue(adminDoc);

    const result = await authService.login('admin', 'admin1234', '127.0.0.1');

    expect(result.admin.username).toBe('admin');
    expect(result.token).toBeDefined();
    expect(mockAdminRepository.resetFailedAttempts).toHaveBeenCalledWith('admin-id-123');
    expect(mockAdminRepository.updateLoginMetadata).toHaveBeenCalledWith('admin-id-123', '127.0.0.1');
  });

  it('should use dummyCompare and return INVALID_CREDENTIALS when username does not exist', async () => {
    mockAdminRepository.findByUsername.mockResolvedValue(null);
    const spy = vi.spyOn(passwordUtil, 'dummyCompare');

    await expect(authService.login('nonexistent', 'password')).rejects.toThrowError(
      expect.objectContaining({ code: 'INVALID_CREDENTIALS', statusCode: 401 }),
    );

    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('should increment failed attempts and throw INVALID_CREDENTIALS on incorrect password', async () => {
    const passwordHash = await passwordUtil.hash('correctpassword');
    const adminDoc = {
      id: 'admin-id-123',
      username: 'admin',
      passwordHash,
      isActive: true,
      failedLoginAttempts: 2,
      lockUntil: null,
    };

    mockAdminRepository.findByUsername.mockResolvedValue(adminDoc);

    await expect(authService.login('admin', 'wrongpassword')).rejects.toThrowError(
      expect.objectContaining({ code: 'INVALID_CREDENTIALS', statusCode: 401 }),
    );

    expect(mockAdminRepository.incrementFailedAttempts).toHaveBeenCalledWith('admin-id-123', undefined);
  });

  it('should lock the account when failed attempts reach 5', async () => {
    const passwordHash = await passwordUtil.hash('correctpassword');
    const adminDoc = {
      id: 'admin-id-123',
      username: 'admin',
      passwordHash,
      isActive: true,
      failedLoginAttempts: 4,
      lockUntil: null,
    };

    mockAdminRepository.findByUsername.mockResolvedValue(adminDoc);

    await expect(authService.login('admin', 'wrongpassword')).rejects.toThrow();

    expect(mockAdminRepository.incrementFailedAttempts).toHaveBeenCalledWith('admin-id-123', expect.any(Date));
  });

  it('should throw ACCOUNT_LOCKED if account lockUntil is in the future', async () => {
    const adminDoc = {
      id: 'admin-id-123',
      username: 'admin',
      passwordHash: 'somehash',
      isActive: true,
      failedLoginAttempts: 5,
      lockUntil: new Date(Date.now() + 10 * 60 * 1000),
    };

    mockAdminRepository.findByUsername.mockResolvedValue(adminDoc);

    await expect(authService.login('admin', 'correctpassword')).rejects.toThrowError(
      expect.objectContaining({ code: 'ACCOUNT_LOCKED', statusCode: 403 }),
    );
  });

  it('should verify session successfully', async () => {
    const jwtUtil = await import('../src/modules/auth/jwt');
    const token = jwtUtil.generate({ sub: 'admin-id-123', username: 'admin' });
    const adminDoc = {
      id: 'admin-id-123',
      username: 'admin',
      isActive: true,
    };
    mockAdminRepository.findById.mockResolvedValue(adminDoc);

    const result = await authService.verifySession(token);
    expect(result.username).toBe('admin');
  });

  it('should change password successfully', async () => {
    const oldHash = await passwordUtil.hash('oldpassword');
    const adminDoc = {
      id: 'admin-id-123',
      username: 'admin',
      passwordHash: oldHash,
      isActive: true,
    };

    mockAdminRepository.findById.mockResolvedValue(adminDoc);
    mockAdminRepository.updatePassword.mockResolvedValue({
      ...adminDoc,
      passwordChangedAt: new Date(),
    });

    const result = await authService.changePassword('admin-id-123', 'oldpassword', 'newsupersecurepassword');
    expect(result).toBeDefined();
    expect(mockAdminRepository.updatePassword).toHaveBeenCalled();
  });
});
