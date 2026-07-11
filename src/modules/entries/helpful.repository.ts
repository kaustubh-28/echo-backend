import { Types } from 'mongoose';
import { HelpfulModel } from './helpful.model';
import { log } from '@shared/logger/requestContext';

export class HelpfulRepository {
  async create(dto: { entryId: string; visitorHash: string }): Promise<boolean> {
    const doc = await HelpfulModel.create({
      entryId: new Types.ObjectId(dto.entryId),
      visitorHash: dto.visitorHash,
    });
    log.info('Helpful interaction created successfully', { id: doc._id.toString() });
    return true;
  }

  async exists(entryId: string, visitorHash: string): Promise<boolean> {
    if (!Types.ObjectId.isValid(entryId)) {
      return false;
    }
    const count = await HelpfulModel.countDocuments({
      entryId: new Types.ObjectId(entryId),
      visitorHash,
    });
    return count > 0;
  }

  async delete(entryId: string, visitorHash: string): Promise<boolean> {
    if (!Types.ObjectId.isValid(entryId)) {
      return false;
    }
    const result = await HelpfulModel.deleteOne({
      entryId: new Types.ObjectId(entryId),
      visitorHash,
    });
    return (result.deletedCount ?? 0) > 0;
  }

  async countTotal(): Promise<number> {
    return HelpfulModel.countDocuments();
  }
}

export default HelpfulRepository;
