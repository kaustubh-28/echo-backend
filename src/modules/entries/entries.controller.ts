import { NextFunction, Request, Response } from 'express';
import { AppError } from '@shared/errors';
import { sendSuccessResponse } from '@shared/utils/response';
import { EntriesService } from './entries.service';
import { HelpfulService } from './helpful.service';
import { QueryEntriesDto, SearchEntriesDto, toPublicEntry } from './entries.types';

export class EntriesController {
  constructor(
    private readonly entriesService: EntriesService,
    private readonly helpfulService: HelpfulService,
  ) {}

  createEntry = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const entry = await this.entriesService.createEntry(req.body, req);
      sendSuccessResponse({ res, statusCode: 201, data: toPublicEntry(entry) });
    } catch (error) {
      next(error);
    }
  };

  getEntries = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query = req.query as unknown as QueryEntriesDto;
      const { entries, meta } = await this.entriesService.getPublishedEntries(query);
      sendSuccessResponse({ res, data: entries.map(toPublicEntry), meta });
    } catch (error) {
      next(error);
    }
  };

  searchEntries = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query = req.query as unknown as SearchEntriesDto;
      const { entries, meta } = await this.entriesService.searchEntries(query);
      sendSuccessResponse({ res, data: entries.map(toPublicEntry), meta });
    } catch (error) {
      next(error);
    }
  };

  getRandomEntry = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const limit = Number(req.query.limit) || 1;
      const entries = await this.entriesService.getRandomEntries(limit);
      const data = limit === 1 ? (entries[0] ? toPublicEntry(entries[0]) : null) : entries.map(toPublicEntry);
      sendSuccessResponse({ res, data });
    } catch (error) {
      next(error);
    }
  };

  getDailyEntry = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const entry = await this.entriesService.getDailyEntry();
      sendSuccessResponse({ res, data: entry ? toPublicEntry(entry) : null });
    } catch (error) {
      next(error);
    }
  };

  getEntryStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const submissionId = req.params.submissionId as string;
      const entry = await this.entriesService.getEntryBySubmissionId(submissionId);

      if (!entry) {
        throw new AppError(
          `Entry with submission ID ${submissionId} not found`,
          404,
          'ENTRY_NOT_FOUND',
        );
      }

      sendSuccessResponse({
        res,
        data: {
          submissionId: entry.submissionId,
          status: entry.status,
          createdAt: entry.createdAt,
          updatedAt: entry.updatedAt,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  markHelpful = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const entryId = req.params.id as string;
      const result = await this.helpfulService.markHelpful(entryId, req);
      sendSuccessResponse({ res, statusCode: 201, data: result });
    } catch (error) {
      next(error);
    }
  };

  reportEntry = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const entryId = req.params.id as string;
      const { reason } = req.body;
      await this.entriesService.reportEntry(entryId, reason, req);
      sendSuccessResponse({ res, statusCode: 201, data: { success: true } });
    } catch (error) {
      next(error);
    }
  };
}

export default EntriesController;
