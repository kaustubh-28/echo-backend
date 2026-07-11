import { generateSubmissionId } from '@shared/utils/submission-id';
import { log } from '@shared/logger/requestContext';
import { AppError } from '@shared/errors';
import { Request } from 'express';
import { VisitorService } from '@shared/services/visitor.service';
import { EntryStatus, ReportReason, REPORT_LIMITS } from './entries.constants';
import { EntriesRepository } from './entries.repository';
import { ReportRepository } from './report.repository';
import { ModerationEngine } from '../moderation/moderationEngine';
import { ModerationWorkflow } from '../moderation/moderation.workflow';
import { NotificationDispatcher } from '../notifications/notificationDispatcher';
import { ModerationAction } from '@shared/types';
import {
  CreateEntryDto,
  Entry,
  QueryEntriesDto,
  SearchEntriesDto,
  UpdateEntryStatusDto,
  PaginatedEntriesResult,
} from './entries.types';

export class EntriesService {
  private readonly moderationEngine: ModerationEngine;
  private readonly moderationWorkflow: ModerationWorkflow;

  constructor(
    private readonly entriesRepository: EntriesRepository,
    private readonly reportRepository: ReportRepository,
    private readonly visitorService: VisitorService,
    private readonly notificationDispatcher: NotificationDispatcher,
  ) {
    this.moderationEngine = new ModerationEngine();
    this.moderationWorkflow = new ModerationWorkflow();
  }

  async createEntry(dto: CreateEntryDto, req: Request): Promise<Entry> {
    const submissionId = generateSubmissionId();
    const { visitorHash } = this.visitorService.resolve(req);

    // 1. Create transient Entry object
    const transientEntry: Partial<Entry> = {
      submissionId,
      text: dto.text,
      author: dto.author,
      source: dto.source,
      category: dto.category,
      email: dto.email,
      visitorHash,
    };

    // 2. Evaluate using ModerationEngine
    const decision = await this.moderationEngine.evaluate(transientEntry);

    // 3. Persist Entry with the resolved status
    const entry = await this.entriesRepository.create({
      ...dto,
      submissionId,
      visitorHash,
      status: decision.status,
    });

    // 4. ModerationWorkflow.transition() from null to the resolved status
    const entryForTransition = { ...entry, status: null };

    let action = ModerationAction.AUTO_APPROVED;
    if (decision.status === EntryStatus.REMOVED) {
      action = ModerationAction.AUTO_REJECTED;
    } else if (decision.status === EntryStatus.SHADOW_HIDDEN) {
      action = ModerationAction.AUTO_HIDDEN;
    }

    const updatedEntry = await this.moderationWorkflow.transition(
      entryForTransition,
      decision.status,
      action,
      decision.reason || 'Automated evaluation complete',
      null,
      { confidence: decision.confidence, triggeredRules: decision.triggeredRules },
    );

    // 5. Dispatch submission received notification
    if (updatedEntry.email) {
      try {
        await this.notificationDispatcher.submissionReceived(
          updatedEntry.email,
          updatedEntry.submissionId,
          updatedEntry.text,
        );
      } catch (err) {
        log.error(err, 'Background submission received email failure', {
          submissionId: updatedEntry.submissionId,
        });
      }
    }

    return updatedEntry;
  }

  async getEntryById(id: string): Promise<Entry | null> {
    return this.entriesRepository.findById(id);
  }

  async getEntryBySubmissionId(submissionId: string): Promise<Entry | null> {
    return this.entriesRepository.findBySubmissionId(submissionId);
  }

  async getPublishedEntries(query: QueryEntriesDto): Promise<PaginatedEntriesResult> {
    const page = Number(query.page ?? 1);
    const limit = Number(query.limit ?? 10);

    const [entries, total] = await Promise.all([
      this.entriesRepository.findPublished({ ...query, page, limit }),
      this.entriesRepository.countPublished(query.category),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      entries,
      meta: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  async getRandomEntries(limit = 1): Promise<Entry[]> {
    return this.entriesRepository.findRandom(limit);
  }

  async getDailyEntry(): Promise<Entry | null> {
    return this.selectDailyEntry();
  }

  private async selectDailyEntry(): Promise<Entry | null> {
    const entries = await this.entriesRepository.findRandom(1);
    return entries[0] || null;
  }

  async searchEntries(query: SearchEntriesDto): Promise<PaginatedEntriesResult> {
    if (!query.q || !query.q.trim()) {
      throw new AppError('Search query is required', 400, 'VALIDATION_ERROR');
    }

    const page = Number(query.page ?? 1);
    const limit = Number(query.limit ?? 10);

    const [entries, total] = await Promise.all([
      this.entriesRepository.search({ ...query, page, limit }),
      this.entriesRepository.countSearch({ q: query.q, category: query.category }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      entries,
      meta: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  async updateEntryStatus(id: string, dto: UpdateEntryStatusDto): Promise<Entry | null> {
    return this.entriesRepository.updateStatus(id, dto);
  }

  async reportEntry(entryId: string, reason: ReportReason, req: Request): Promise<void> {
    const entry = await this.entriesRepository.findById(entryId);

    if (!entry) {
      throw new AppError('Entry not found', 404, 'ENTRY_NOT_FOUND');
    }

    if (entry.status === EntryStatus.REMOVED) {
      throw new AppError('Entry not found', 404, 'ENTRY_NOT_FOUND');
    }

    const { visitorHash } = this.visitorService.resolve(req);

    const isAlreadyReported = await this.reportRepository.exists(entryId, visitorHash);
    if (isAlreadyReported) {
      throw new AppError('Visitor has already reported this entry', 409, 'CONFLICT');
    }

    await this.reportRepository.create({ entryId, visitorHash, reason });
    const updatedEntry = await this.entriesRepository.incrementReportCount(entryId);

    if (updatedEntry && updatedEntry.status === EntryStatus.PUBLISHED) {
      if (updatedEntry.reportCount >= REPORT_LIMITS.HIDE_THRESHOLD) {
        await this.moderationWorkflow.reportThreshold(updatedEntry, 'Report threshold reached');
      }
    }
  }
}

export default EntriesService;
