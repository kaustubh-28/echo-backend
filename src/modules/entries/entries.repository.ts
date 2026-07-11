import { Types } from 'mongoose';
import { EntryCategory, EntryStatus } from './entries.constants';
import { EntryModel } from './entries.model';
import {
  CreateEntryDto,
  Entry,
  QueryEntriesDto,
  SearchEntriesDto,
  UpdateEntryStatusDto,
} from './entries.types';
import { log } from '@shared/logger/requestContext';

export class EntriesRepository {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private mapDocument(doc: any): Entry {
    return {
      id: doc._id.toString(),
      submissionId: doc.submissionId,
      text: doc.text,
      author: doc.author,
      source: doc.source,
      category: doc.category,
      email: doc.email,
      visitorHash: doc.visitorHash,
      status: doc.status,
      moderationReason: doc.moderationReason,
      moderatedBy: doc.moderatedBy ? doc.moderatedBy.toString() : undefined,
      moderatedAt: doc.moderatedAt,
      helpfulCount: doc.helpfulCount,
      reportCount: doc.reportCount,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }

  async create(
    dto: CreateEntryDto & { submissionId: string; visitorHash: string; status?: EntryStatus },
  ): Promise<Entry> {
    const doc = await EntryModel.create(dto);
    log.info('Entry created successfully', { id: doc._id.toString() });
    return this.mapDocument(doc);
  }

  async findById(id: string): Promise<Entry | null> {
    if (!Types.ObjectId.isValid(id)) {
      log.error(new Error('Invalid entry ID'));
      return null;
    }
    const doc = await EntryModel.findById(id);

    if (doc) {
      log.info('Entry found successfully', { id: doc._id.toString() });
    } else {
      log.warn('Entry not found', { id });
    }

    return doc ? this.mapDocument(doc) : null;
  }

  async findBySubmissionId(submissionId: string): Promise<Entry | null> {
    const doc = await EntryModel.findOne({ submissionId });
    if (doc) {
      log.info('Entry found successfully', { id: doc._id.toString() });
    } else {
      log.warn('Entry not found', { submissionId });
    }
    return doc ? this.mapDocument(doc) : null;
  }

  async findPublished(query: QueryEntriesDto): Promise<Entry[]> {
    const { category, page = 1, limit = 10 } = query;
    const filter: Record<string, unknown> = { status: EntryStatus.PUBLISHED };
    if (category) {
      filter.category = category;
    }
    const docs = await EntryModel.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);
    log.info('Entries found successfully', { count: docs.length });
    return docs.map((doc) => this.mapDocument(doc));
  }

  async countPublished(category?: EntryCategory): Promise<number> {
    const filter: Record<string, unknown> = { status: EntryStatus.PUBLISHED };
    if (category) {
      filter.category = category;
    }
    return EntryModel.countDocuments(filter);
  }

  async findRandom(limit: number): Promise<Entry[]> {
    const docs = await EntryModel.aggregate([
      { $match: { status: EntryStatus.PUBLISHED } },
      { $sample: { size: limit } },
    ]);
    log.info('Random entries found successfully', { count: docs.length });
    return docs.map((doc) => this.mapDocument(doc));
  }

  async search(query: SearchEntriesDto): Promise<Entry[]> {
    const { q, category, page = 1, limit = 10 } = query;
    const searchRegex = new RegExp(q.trim(), 'i');
    const filter: Record<string, any> = {
      status: EntryStatus.PUBLISHED,
      $or: [
        { submissionId: searchRegex },
        { text: searchRegex },
        { author: searchRegex },
        { source: searchRegex }
      ]
    };
    if (category) {
      filter.category = category;
    }
    const docs = await EntryModel.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);
    log.info('Entries found successfully', { count: docs.length });
    return docs.map((doc) => this.mapDocument(doc));
  }

  async countSearch(query: { q: string; category?: EntryCategory }): Promise<number> {
    const { q, category } = query;
    const searchRegex = new RegExp(q.trim(), 'i');
    const filter: Record<string, any> = {
      status: EntryStatus.PUBLISHED,
      $or: [
        { submissionId: searchRegex },
        { text: searchRegex },
        { author: searchRegex },
        { source: searchRegex }
      ]
    };
    if (category) {
      filter.category = category;
    }
    return EntryModel.countDocuments(filter);
  }

  async updateStatus(id: string, dto: UpdateEntryStatusDto): Promise<Entry | null> {
    if (!Types.ObjectId.isValid(id)) {
      return null;
    }
    const doc = await EntryModel.findByIdAndUpdate(
      id,
      {
        $set: {
          status: dto.status,
          moderationReason: dto.moderationReason,
          moderatedBy: new Types.ObjectId(dto.moderatedBy),
          moderatedAt: new Date(),
        },
      },
      { new: true },
    );
    if (doc) {
      log.info('Entry updated successfully', { id: doc._id.toString() });
    } else {
      log.warn('Entry not found', { id });
    }
    return doc ? this.mapDocument(doc) : null;
  }

  async incrementHelpfulCount(id: string): Promise<Entry | null> {
    if (!Types.ObjectId.isValid(id)) {
      return null;
    }
    const doc = await EntryModel.findByIdAndUpdate(
      id,
      { $inc: { helpfulCount: 1 } },
      { new: true },
    );
    if (doc) {
      log.info('Entry updated successfully', { id: doc._id.toString() });
    } else {
      log.warn('Entry not found', { id });
    }
    return doc ? this.mapDocument(doc) : null;
  }

  async decrementHelpfulCount(id: string): Promise<Entry | null> {
    if (!Types.ObjectId.isValid(id)) {
      return null;
    }
    const doc = await EntryModel.findByIdAndUpdate(
      id,
      { $inc: { helpfulCount: -1 } },
      { new: true },
    );
    if (doc) {
      log.info('Entry updated successfully', { id: doc._id.toString() });
    } else {
      log.warn('Entry not found', { id });
    }
    return doc ? this.mapDocument(doc) : null;
  }

  async incrementReportCount(id: string): Promise<Entry | null> {
    if (!Types.ObjectId.isValid(id)) {
      return null;
    }
    const doc = await EntryModel.findByIdAndUpdate(id, { $inc: { reportCount: 1 } }, { new: true });
    if (doc) {
      log.info('Entry updated successfully', { id: doc._id.toString() });
    } else {
      log.warn('Entry not found', { id });
    }
    return doc ? this.mapDocument(doc) : null;
  }

  async decrementReportCount(id: string): Promise<Entry | null> {
    if (!Types.ObjectId.isValid(id)) {
      return null;
    }
    const doc = await EntryModel.findByIdAndUpdate(
      id,
      { $inc: { reportCount: -1 } },
      { new: true },
    );
    if (doc) {
      log.info('Entry updated successfully', { id: doc._id.toString() });
    } else {
      log.warn('Entry not found', { id });
    }
    return doc ? this.mapDocument(doc) : null;
  }

  async autoHideEntry(id: string): Promise<Entry | null> {
    if (!Types.ObjectId.isValid(id)) {
      return null;
    }
    const doc = await EntryModel.findByIdAndUpdate(
      id,
      {
        $set: {
          status: EntryStatus.SHADOW_HIDDEN,
          moderationReason: 'Auto-hidden: report threshold reached',
          moderatedAt: new Date(),
        },
      },
      { new: true },
    );
    if (doc) {
      log.info('Entry auto-hidden successfully', { id: doc._id.toString() });
    } else {
      log.warn('Entry not found', { id });
    }
    return doc ? this.mapDocument(doc) : null;
  }

  async findShadowHidden(): Promise<Entry[]> {
    const docs = await EntryModel.find({ status: EntryStatus.SHADOW_HIDDEN }).sort({ createdAt: 1 });
    return docs.map((doc) => this.mapDocument(doc));
  }

  async getStatusCounts(): Promise<{ [key in EntryStatus]?: number }> {
    const results = await EntryModel.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    const counts: { [key in EntryStatus]?: number } = {};
    for (const res of results) {
      counts[res._id as EntryStatus] = res.count;
    }
    return counts;
  }

  async countCreatedSince(date: Date): Promise<number> {
    return EntryModel.countDocuments({ createdAt: { $gte: date } });
  }

  async findForQueue(query: {
    status: EntryStatus;
    category?: EntryCategory;
    sort: 'oldest' | 'newest' | 'reports';
    page: number;
    limit: number;
  }): Promise<{ entries: Entry[]; total: number }> {
    const filter: Record<string, unknown> = { status: query.status };
    if (query.category) {
      filter.category = query.category;
    }

    let sortObj: Record<string, any> = { createdAt: 1 };
    if (query.sort === 'newest') {
      sortObj = { createdAt: -1 };
    } else if (query.sort === 'reports') {
      sortObj = { reportCount: -1 };
    }

    const [docs, total] = await Promise.all([
      EntryModel.find(filter)
        .sort(sortObj)
        .skip((query.page - 1) * query.limit)
        .limit(query.limit),
      EntryModel.countDocuments(filter),
    ]);

    return {
      entries: docs.map((doc) => this.mapDocument(doc)),
      total,
    };
  }

  async findByTextAndStatus(text: string, status: EntryStatus): Promise<Entry | null> {
    const doc = await EntryModel.findOne({ text, status });
    return doc ? this.mapDocument(doc) : null;
  }
}

export default EntriesRepository;
