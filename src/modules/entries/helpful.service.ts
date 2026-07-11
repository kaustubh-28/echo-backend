import { Request } from 'express';
import { AppError } from '@shared/errors';
import { EntriesRepository } from './entries.repository';
import { HelpfulRepository } from './helpful.repository';
import { VisitorService } from '@shared/services/visitor.service';
import { EntryStatus } from './entries.constants';
import { Entry } from './entries.types';

export class HelpfulService {
  constructor(
    private readonly entriesRepository: EntriesRepository,
    private readonly helpfulRepository: HelpfulRepository,
    private readonly visitorService: VisitorService,
  ) {}

  async markHelpful(
    entryId: string,
    req: Request,
  ): Promise<{ helpfulCount: number; viewerHasMarkedHelpful: boolean }> {
    const entry = await this.entriesRepository.findById(entryId);

    if (!entry) {
      throw new AppError('Entry not found', 404, 'ENTRY_NOT_FOUND');
    }

    if (entry.status !== EntryStatus.PUBLISHED) {
      throw new AppError('Entry not found', 404, 'ENTRY_NOT_FOUND');
    }

    const { visitorHash } = this.visitorService.resolve(req);

    const isAlreadyHelpful = await this.helpfulRepository.exists(entryId, visitorHash);
    let viewerHasMarkedHelpful: boolean;
    let updatedEntry: Entry | null;

    if (isAlreadyHelpful) {
      await this.helpfulRepository.delete(entryId, visitorHash);
      updatedEntry = await this.entriesRepository.decrementHelpfulCount(entryId);
      viewerHasMarkedHelpful = false;
    } else {
      await this.helpfulRepository.create({ entryId, visitorHash });
      updatedEntry = await this.entriesRepository.incrementHelpfulCount(entryId);
      viewerHasMarkedHelpful = true;
    }

    const helpfulCount = updatedEntry ? updatedEntry.helpfulCount : entry.helpfulCount;

    return {
      helpfulCount,
      viewerHasMarkedHelpful,
    };
  }
}

export default HelpfulService;
