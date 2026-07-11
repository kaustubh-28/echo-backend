import { Entry } from '../../entries/entries.types';
import { IModerationLogDocument } from '../../moderation/moderationLog.model';
import { IReportDocument } from '../../entries/report.model';
import { ModerationSummaryDTO } from '../dto/review.dto';
import { EntryStatus } from '../../entries/entries.constants';

export class ModerationSummaryBuilder {
  static build(
    entry: Entry,
    reports: IReportDocument[],
    logs: IModerationLogDocument[],
  ): ModerationSummaryDTO {
    let confidence: number | undefined;
    let triggeredRules: string[] | undefined;

    // Search from newest to oldest to find any evaluation metadata
    const sortedLogsDesc = [...logs].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    for (const log of sortedLogsDesc) {
      if (log.metadata && (log.metadata.confidence !== undefined || log.metadata.triggeredRules !== undefined)) {
        if (confidence === undefined && log.metadata.confidence !== undefined) {
          confidence = log.metadata.confidence;
        }
        if (triggeredRules === undefined && log.metadata.triggeredRules !== undefined) {
          triggeredRules = log.metadata.triggeredRules;
        }
      }
    }

    let latestReportAt: Date | null = null;
    if (reports.length > 0) {
      const sortedReportsDesc = [...reports].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      latestReportAt = sortedReportsDesc[0]?.createdAt || null;
    }

    return {
      currentStatus: entry.status,
      moderationReason: entry.moderationReason || null,
      confidence,
      triggeredRules,
      reportCount: entry.reportCount || 0,
      helpfulCount: entry.helpfulCount || 0,
      latestReportAt,
      pendingReview: entry.status === EntryStatus.SHADOW_HIDDEN,
    };
  }
}

export default ModerationSummaryBuilder;
