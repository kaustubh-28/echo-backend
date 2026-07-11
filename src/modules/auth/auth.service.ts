import { AdminRepository } from '../admin/admin.repository';
import * as passwordUtil from './password';
import * as jwtUtil from './jwt';
import { AppError } from '@shared/errors';
import { Admin } from '../admin/admin.types';

export class AuthService {
  constructor(private readonly adminRepository: AdminRepository) {}

  async login(username?: string, password?: string, ip?: string): Promise<{ admin: Admin; token: string }> {
    if (!username || !password) {
      throw new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
    }

    const adminWithHash = await this.adminRepository.findByUsername(username);

    // If account locked
    if (adminWithHash && adminWithHash.lockUntil && adminWithHash.lockUntil > new Date()) {
      throw new AppError('Account is temporarily locked due to repeated failed login attempts', 403, 'ACCOUNT_LOCKED');
    }

    // Perform bcrypt comparison (use dummyCompare if username does not exist)
    let isPasswordValid = false;
    if (adminWithHash) {
      isPasswordValid = await passwordUtil.compare(password, adminWithHash.passwordHash);
    } else {
      await passwordUtil.dummyCompare();
    }

    // Password incorrect or admin not found
    if (!adminWithHash || !isPasswordValid) {
      if (adminWithHash) {
        // Increment failed attempts
        const updatedAttempts = adminWithHash.failedLoginAttempts + 1;
        let lockUntil: Date | null = null;
        if (updatedAttempts >= 5) {
          lockUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
        }
        await this.adminRepository.incrementFailedAttempts(adminWithHash.id, lockUntil || undefined);
      }
      throw new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
    }

    // Ensure isActive (Check if account is active)
    if (!adminWithHash.isActive) {
      throw new AppError('Account is disabled', 403, 'ACCOUNT_DISABLED');
    }

    // Password correct -> reset failed attempts
    await this.adminRepository.resetFailedAttempts(adminWithHash.id);

    // Update last login metadata
    const clientIp = ip || 'unknown';
    const updatedAdmin = await this.adminRepository.updateLoginMetadata(adminWithHash.id, clientIp);

    // Generate JWT
    const token = jwtUtil.generate({ sub: updatedAdmin.id, username: updatedAdmin.username });

    return { admin: updatedAdmin, token };
  }

  async logout(): Promise<void> {
    // No database changes required
  }

  async verifySession(token: string): Promise<Admin> {
    try {
      const decoded = jwtUtil.verify(token);
      const adminWithHash = await this.adminRepository.findById(decoded.sub);
      if (!adminWithHash) {
        throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
      }
      if (!adminWithHash.isActive) {
        throw new AppError('Account is disabled', 401, 'UNAUTHORIZED');
      }
      const admin = { ...adminWithHash } as any;
      delete admin.passwordHash;
      return admin as Admin;
    } catch {
      throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
    }
  }

  async changePassword(adminId: string, currentPassword?: string, newPassword?: string): Promise<Admin> {
    if (!currentPassword || !newPassword) {
      throw new AppError('Passwords are required', 400, 'VALIDATION_ERROR');
    }

    const adminWithHash = await this.adminRepository.findById(adminId);
    if (!adminWithHash) {
      throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
    }

    const isPasswordValid = await passwordUtil.compare(currentPassword, adminWithHash.passwordHash);
    if (!isPasswordValid) {
      throw new AppError('Invalid current password', 400, 'VALIDATION_ERROR');
    }

    const newPasswordHash = await passwordUtil.hash(newPassword);
    const updatedAdmin = await this.adminRepository.updatePassword(adminId, newPasswordHash);

    return updatedAdmin;
  }
}

export default AuthService;
