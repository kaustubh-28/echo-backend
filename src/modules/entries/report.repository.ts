import { Types } from 'mongoose';
import { ReportModel } from './report.model';
import { ReportReason } from './entries.constants';
import { log } from '@shared/logger/requestContext';

export class ReportRepository {
  async create(dto: { entryId: string; visitorHash: string; reason: ReportReason }): Promise<boolean> {
    const doc = await ReportModel.create({
      entryId: new Types.ObjectId(dto.entryId),
      visitorHash: dto.visitorHash,
      reason: dto.reason,
    });
    log.info('Report created successfully', { id: doc._id.toString() });
    return true;
  }

  async exists(entryId: string, visitorHash: string): Promise<boolean> {
    if (!Types.ObjectId.isValid(entryId)) {
      return false;
    }
    const count = await ReportModel.countDocuments({
      entryId: new Types.ObjectId(entryId),
      visitorHash,
    });
    return count > 0;
  }

  async count(entryId: string): Promise<number> {
    if (!Types.ObjectId.isValid(entryId)) {
      return 0;
    }
    return ReportModel.countDocuments({
      entryId: new Types.ObjectId(entryId),
    });
  }

  async countTotal(): Promise<number> {
    return ReportModel.countDocuments();
  }

  async countCreatedSince(date: Date): Promise<number> {
    return ReportModel.countDocuments({ createdAt: { $gte: date } });
  }
}

export default ReportRepository;
