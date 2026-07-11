import { Types } from 'mongoose';
import { EntriesRepository } from '../entries/entries.repository';
import { AdminRepository } from './admin.repository';
import { ReportModel } from '../entries/report.model';
import { ModerationLogModel } from '../moderation/moderationLog.model';
import { TimelineMapper } from './mappers/timeline.mapper';
import { ModerationSummaryBuilder } from './mappers/moderation-summary.builder';
import { ReportSummaryBuilder } from './mappers/report-summary.builder';
import { ReviewItemDTO } from './dto/review.dto';
import { EntryCategory, EntryStatus } from '../entries/entries.constants';
import { AppError } from '@shared/errors';
import { ModerationWorkflow } from '../moderation/moderation.workflow';
import { Entry } from '../entries/entries.types';

export class ReviewService {
  private readonly moderationWorkflow: ModerationWorkflow;

  constructor(
    private readonly entriesRepository: EntriesRepository,
    private readonly adminRepository: AdminRepository,
  ) {
    this.moderationWorkflow = new ModerationWorkflow();
  }

  async getReviewQueue(query: {
    page?: number;
    limit?: number;
    status?: string;
    category?: string;
    sort?: string;
  }): Promise<{ reviewItems: ReviewItemDTO[]; total: number; page: number; limit: number }> {
    const pageVal = Number(query.page) || 1;
    const limitVal = Number(query.limit) || 10;

    const statusVal = (query.status as EntryStatus) || EntryStatus.SHADOW_HIDDEN;
    const categoryVal = query.category as EntryCategory | undefined;

    let sortVal: 'oldest' | 'newest' | 'reports' = 'oldest';
    if (query.sort === 'newest') {
      sortVal = 'newest';
    } else if (query.sort === 'reports') {
      sortVal = 'reports';
    }

    const { entries, total } = await this.entriesRepository.findForQueue({
      status: statusVal,
      category: categoryVal,
      sort: sortVal,
      page: pageVal,
      limit: limitVal,
    });

    if (entries.length === 0) {
      return { reviewItems: [], total, page: pageVal, limit: limitVal };
    }

    const entryIds = entries.map((e) => new Types.ObjectId(e.id));

    const [allReports, allLogs] = await Promise.all([
      ReportModel.find({ entryId: { $in: entryIds } }),
      ModerationLogModel.find({ entryId: { $in: entryIds } }),
    ]);

    const adminIdsSet = new Set<string>();
    for (const log of allLogs) {
      if (log.performedBy) {
        adminIdsSet.add(log.performedBy.toString());
      }
    }
    const adminIds = Array.from(adminIdsSet);
    const admins = adminIds.length > 0 ? await this.adminRepository.findByIds(adminIds) : [];
    const adminsMap = new Map<string, string>();
    for (const a of admins) {
      adminsMap.set(a.id, a.username);
    }

    const reviewItems: ReviewItemDTO[] = entries.map((entry) => {
      const entryReports = allReports.filter((r) => r.entryId.toString() === entry.id);
      const entryLogs = allLogs.filter((l) => l.entryId.toString() === entry.id);

      return this.buildReviewItemDTO(entry, entryReports, entryLogs, adminsMap);
    });

    return {
      reviewItems,
      total,
      page: pageVal,
      limit: limitVal,
    };
  }

  async approveEntry(id: string, adminId: string): Promise<ReviewItemDTO> {
    const entry = await this.entriesRepository.findById(id);
    if (!entry) {
      throw new AppError('Entry not found', 404, 'ENTRY_NOT_FOUND');
    }
    if (entry.status !== EntryStatus.SHADOW_HIDDEN) {
      throw new AppError('Entry is not in review queue', 400, 'BAD_REQUEST');
    }

    let updatedEntry: Entry;
    try {
      updatedEntry = await this.moderationWorkflow.approve(entry, adminId);
    } catch (error: any) {
      const dbEntry = await this.entriesRepository.findById(id);
      if (dbEntry && dbEntry.status === EntryStatus.PUBLISHED) {
        updatedEntry = dbEntry;
      } else {
        throw error;
      }
    }

    return this.getSingleReviewItemDTO(updatedEntry);
  }

  async removeEntry(id: string, adminId: string, reason?: string): Promise<ReviewItemDTO> {
    const entry = await this.entriesRepository.findById(id);
    if (!entry) {
      throw new AppError('Entry not found', 404, 'ENTRY_NOT_FOUND');
    }

    let updatedEntry: Entry;
    try {
      updatedEntry = await this.moderationWorkflow.remove(entry, adminId, reason);
    } catch (error: any) {
      const dbEntry = await this.entriesRepository.findById(id);
      if (dbEntry && dbEntry.status === EntryStatus.REMOVED) {
        updatedEntry = dbEntry;
      } else {
        throw error;
      }
    }

    return this.getSingleReviewItemDTO(updatedEntry);
  }

  private async getSingleReviewItemDTO(entry: Entry): Promise<ReviewItemDTO> {
    const entryId = new Types.ObjectId(entry.id);
    const [reports, logs] = await Promise.all([
      ReportModel.find({ entryId }),
      ModerationLogModel.find({ entryId }),
    ]);

    const adminIdsSet = new Set<string>();
    for (const log of logs) {
      if (log.performedBy) {
        adminIdsSet.add(log.performedBy.toString());
      }
    }
    const adminIds = Array.from(adminIdsSet);
    const admins = adminIds.length > 0 ? await this.adminRepository.findByIds(adminIds) : [];
    const adminsMap = new Map<string, string>();
    for (const a of admins) {
      adminsMap.set(a.id, a.username);
    }

    return this.buildReviewItemDTO(entry, reports, logs, adminsMap);
  }

  private buildReviewItemDTO(
    entry: Entry,
    reports: any[],
    logs: any[],
    adminsMap: Map<string, string>,
  ): ReviewItemDTO {
    const moderation = ModerationSummaryBuilder.build(entry, reports, logs);
    const reportsSummary = ReportSummaryBuilder.build(reports);
    const timeline = TimelineMapper.map(logs, adminsMap);

    return {
      entry,
      moderation,
      reports: reportsSummary,
      timeline,
      availableActions: this.getAvailableActions(entry.status),
    };
  }

  private getAvailableActions(status: EntryStatus): string[] {
    if (status === EntryStatus.PUBLISHED) {
      return ['remove'];
    } else if (status === EntryStatus.SHADOW_HIDDEN) {
      return ['approve', 'remove'];
    }
    return [];
  }
}

export default ReviewService;
