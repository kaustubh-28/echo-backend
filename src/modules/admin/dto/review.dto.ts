import { Entry } from '../../entries/entries.types';
import { EntryStatus } from '../../entries/entries.constants';

export interface TimelineItemDTO {
  action: string;
  oldStatus: string | null;
  newStatus: string;
  reason: string | null;
  performedBy: string | null;
  createdAt: Date;
}

export interface ReportSummaryDTO {
  totalReports: number;
  reasonBreakdown: Record<string, number>;
  latestReports: Array<{
    id: string;
    reason: string;
    createdAt: Date;
  }>;
}

export interface ModerationSummaryDTO {
  currentStatus: EntryStatus;
  moderationReason?: string | null;
  confidence?: number;
  triggeredRules?: string[];
  reportCount: number;
  helpfulCount: number;
  latestReportAt?: Date | null;
  pendingReview: boolean;
}

export interface ReviewItemDTO {
  entry: Entry;
  moderation: ModerationSummaryDTO;
  reports: ReportSummaryDTO;
  timeline: TimelineItemDTO[];
  availableActions: string[];
}
