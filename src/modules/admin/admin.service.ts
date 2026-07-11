import { env } from '@config/env';
import { AdminRepository } from './admin.repository';
import * as passwordUtil from '../auth/password';

export class AdminService {
  constructor(
    private readonly adminRepository: AdminRepository,
  ) {}

  async ensureAdminExists(): Promise<void> {
    const existing = await this.adminRepository.findByUsername(env.ADMIN_USERNAME);
    if (!existing) {
      let passwordHash = env.ADMIN_PASSWORD_HASH;
      if (!passwordHash) {
        passwordHash = await passwordUtil.hash('admin');
      }
      await this.adminRepository.create({
        username: env.ADMIN_USERNAME,
        passwordHash,
      });
    }
  }
}

export default AdminService;
