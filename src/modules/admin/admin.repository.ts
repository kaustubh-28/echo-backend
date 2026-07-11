import { AdminModel, IAdminDocument } from './admin.model';
import { Admin } from './admin.types';
import { Types } from 'mongoose';
import { log } from '@shared/logger/requestContext';
import { AppError } from '@shared/errors';

export class AdminRepository {
  private mapDocument(doc: IAdminDocument): Admin {
    return {
      id: doc._id.toString(),
      username: doc.username,
      isActive: doc.isActive,
      failedLoginAttempts: doc.failedLoginAttempts,
      lockUntil: doc.lockUntil,
      lastLoginAt: doc.lastLoginAt,
      lastLoginIp: doc.lastLoginIp,
      passwordChangedAt: doc.passwordChangedAt,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }

  async findById(id: string): Promise<(Admin & { passwordHash: string }) | null> {
    const doc = await AdminModel.findById(id);
    if (!doc) {
      return null;
    }
    return {
      ...this.mapDocument(doc),
      passwordHash: doc.passwordHash,
    };
  }

  async findByUsername(username: string): Promise<(Admin & { passwordHash: string }) | null> {
    const doc = await AdminModel.findOne({ username: username.toLowerCase() });
    if (!doc) {
      return null;
    }
    return {
      ...this.mapDocument(doc),
      passwordHash: doc.passwordHash,
    };
  }

  async create(dto: { username: string; passwordHash: string }): Promise<Admin> {
    const doc = await AdminModel.create({
      username: dto.username.toLowerCase(),
      passwordHash: dto.passwordHash,
    });
    log.info('Admin created successfully', { username: doc.username });
    return this.mapDocument(doc);
  }

  async update(id: string, updateData: Partial<IAdminDocument>): Promise<Admin> {
    const doc = await AdminModel.findByIdAndUpdate(id, { $set: updateData }, { new: true });
    if (!doc) {
      throw new AppError('Admin not found', 404, 'ADMIN_NOT_FOUND');
    }
    return this.mapDocument(doc);
  }

  async incrementFailedAttempts(id: string, lockUntil?: Date): Promise<Admin> {
    const update: Record<string, unknown> = { $inc: { failedLoginAttempts: 1 } };
    if (lockUntil) {
      update.$set = { lockUntil };
    }
    const doc = await AdminModel.findByIdAndUpdate(id, update, { new: true });
    if (!doc) {
      throw new AppError('Admin not found', 404, 'ADMIN_NOT_FOUND');
    }
    return this.mapDocument(doc);
  }

  async resetFailedAttempts(id: string): Promise<Admin> {
    const doc = await AdminModel.findByIdAndUpdate(
      id,
      { $set: { failedLoginAttempts: 0, lockUntil: null } },
      { new: true },
    );
    if (!doc) {
      throw new AppError('Admin not found', 404, 'ADMIN_NOT_FOUND');
    }
    return this.mapDocument(doc);
  }

  async updatePassword(id: string, passwordHash: string): Promise<Admin> {
    const doc = await AdminModel.findByIdAndUpdate(
      id,
      { $set: { passwordHash, passwordChangedAt: new Date() } },
      { new: true },
    );
    if (!doc) {
      throw new AppError('Admin not found', 404, 'ADMIN_NOT_FOUND');
    }
    return this.mapDocument(doc);
  }

  async updateLoginMetadata(id: string, lastLoginIp: string): Promise<Admin> {
    const doc = await AdminModel.findByIdAndUpdate(
      id,
      { $set: { lastLoginAt: new Date(), lastLoginIp } },
      { new: true },
    );
    if (!doc) {
      throw new AppError('Admin not found', 404, 'ADMIN_NOT_FOUND');
    }
    return this.mapDocument(doc);
  }

  async findByIds(ids: string[]): Promise<Admin[]> {
    const objectIds = ids.map((id) => new Types.ObjectId(id));
    const docs = await AdminModel.find({ _id: { $in: objectIds } });
    return docs.map((doc) => this.mapDocument(doc));
  }
}

export default AdminRepository;
