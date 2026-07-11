import { describe, expect, it, vi } from 'vitest';
import { TimelineMapper } from '../src/modules/admin/mappers/timeline.mapper';
import { ModerationSummaryBuilder } from '../src/modules/admin/mappers/moderation-summary.builder';
import { ReportSummaryBuilder } from '../src/modules/admin/mappers/report-summary.builder';
import { ReviewService } from '../src/modules/admin/review.service';
import { DashboardService } from '../src/modules/admin/dashboard.service';
import { EntryStatus } from '../src/modules/entries/entries.constants';
import { ModerationAction } from '../src/shared/types';
import { EntryModel } from '../src/modules/entries/entries.model';
import { ReportModel } from '../src/modules/entries/report.model';
import { ModerationLogModel } from '../src/modules/moderation/moderationLog.model';

vi.mock('../src/modules/entries/entries.model', () => {
  return {
    EntryModel: {
      aggregate: vi.fn(),
      findOne: vi.fn(),
    },
    default: {
      aggregate: vi.fn(),
      findOne: vi.fn(),
    },
  };
});

vi.mock('../src/modules/entries/report.model', () => {
  return {
    ReportModel: {
      find: vi.fn(),
      aggregate: vi.fn(),
    },
    default: {
      find: vi.fn(),
      aggregate: vi.fn(),
    },
  };
});

vi.mock('../src/modules/moderation/moderationLog.model', () => {
  return {
    ModerationLogModel: {
      find: vi.fn(),
      aggregate: vi.fn(),
    },
    default: {
      find: vi.fn(),
      aggregate: vi.fn(),
    },
  };
});

describe('Mappers & Builders Unit Tests', () => {
  it('TimelineMapper should sort oldest to newest and map correctly', () => {
    const logs = [
      {
        action: ModerationAction.ADMIN_APPROVED,
        oldStatus: EntryStatus.SHADOW_HIDDEN,
        newStatus: EntryStatus.PUBLISHED,
        reason: 'Approved',
        performedBy: 'admin-id-1',
        createdAt: new Date('2026-07-11T12:00:00Z'),
      },
      {
        action: ModerationAction.AUTO_HIDDEN,
        oldStatus: null,
        newStatus: EntryStatus.SHADOW_HIDDEN,
        reason: 'Auto Hidden',
        performedBy: null,
        createdAt: new Date('2026-07-11T11:00:00Z'),
      },
    ] as any[];

    const adminsMap = new Map([['admin-id-1', 'superadmin']]);
    const timeline = TimelineMapper.map(logs, adminsMap);

    expect(timeline).toHaveLength(2);
    expect(timeline[0].action).toBe(ModerationAction.AUTO_HIDDEN); // Oldest first
    expect(timeline[1].action).toBe(ModerationAction.ADMIN_APPROVED); // Newest second
    expect(timeline[1].performedBy).toBe('superadmin');
  });

  it('ModerationSummaryBuilder should build correct summary', () => {
    const entry = {
      status: EntryStatus.SHADOW_HIDDEN,
      moderationReason: 'spam text',
      reportCount: 3,
      helpfulCount: 0,
    } as any;

    const reports = [
      { createdAt: new Date('2026-07-11T10:00:00Z') },
      { createdAt: new Date('2026-07-11T11:00:00Z') },
    ] as any[];

    const logs = [
      {
        metadata: { confidence: 0.95, triggeredRules: ['spam_filter'] },
        createdAt: new Date('2026-07-11T09:00:00Z'),
      },
    ] as any[];

    const summary = ModerationSummaryBuilder.build(entry, reports, logs);

    expect(summary.currentStatus).toBe(EntryStatus.SHADOW_HIDDEN);
    expect(summary.confidence).toBe(0.95);
    expect(summary.triggeredRules).toContain('spam_filter');
    expect(summary.latestReportAt?.toISOString()).toBe(new Date('2026-07-11T11:00:00Z').toISOString());
    expect(summary.pendingReview).toBe(true);
  });

  it('ReportSummaryBuilder should build breakdown and slice top 5 newest', () => {
    const reports = [
      { _id: 'r1', reason: 'spam', createdAt: new Date('2026-07-11T10:00:00Z') },
      { _id: 'r2', reason: 'spam', createdAt: new Date('2026-07-11T11:00:00Z') },
      { _id: 'r3', reason: 'offensive', createdAt: new Date('2026-07-11T09:00:00Z') },
      { _id: 'r4', reason: 'misinformation', createdAt: new Date('2026-07-11T08:00:00Z') },
      { _id: 'r5', reason: 'spam', createdAt: new Date('2026-07-11T07:00:00Z') },
      { _id: 'r6', reason: 'offensive', createdAt: new Date('2026-07-11T06:00:00Z') },
    ] as any[];

    const summary = ReportSummaryBuilder.build(reports);

    expect(summary.totalReports).toBe(6);
    expect(summary.reasonBreakdown.spam).toBe(3);
    expect(summary.reasonBreakdown.offensive).toBe(2);
    expect(summary.latestReports).toHaveLength(5);
    expect(summary.latestReports[0].id).toBe('r2'); // Newest first
  });
});

describe('ReviewService Unit Tests', () => {
  it('ReviewService.getReviewQueue should fetch and construct review items DTOs', async () => {
    const mockEntriesRepo = {
      findForQueue: vi.fn().mockResolvedValue({
        entries: [
          {
            id: '507f1f77bcf86cd799439011',
            submissionId: 'SUB-123',
            text: 'Spam text',
            category: 'wisdom',
            status: EntryStatus.SHADOW_HIDDEN,
            email: 'moderated-user@example.com',
            createdAt: new Date(),
            updatedAt: new Date(),
          }
        ],
        total: 1
      })
    } as any;

    const mockAdminRepo = {
      findByIds: vi.fn().mockResolvedValue([])
    } as any;

    vi.mocked(ReportModel.find).mockResolvedValueOnce([
      {
        _id: 'report-1',
        entryId: '507f1f77bcf86cd799439011',
        reason: 'spam',
        createdAt: new Date(),
      }
    ] as any);
    vi.mocked(ModerationLogModel.find).mockResolvedValueOnce([
      {
        entryId: '507f1f77bcf86cd799439011',
        action: ModerationAction.AUTO_HIDDEN,
        oldStatus: null,
        newStatus: EntryStatus.SHADOW_HIDDEN,
        reason: 'Spam pattern',
        performedBy: null,
        metadata: { confidence: 0.95, triggeredRules: ['spam_rule'] },
        createdAt: new Date(),
      }
    ] as any);

    const reviewService = new ReviewService(mockEntriesRepo, mockAdminRepo);
    const result = await reviewService.getReviewQueue({ page: 1, limit: 10 });

    expect(result.total).toBe(1);
    expect(result.reviewItems).toHaveLength(1);
    expect(result.reviewItems[0].entry.submissionId).toBe('SUB-123');
    expect(result.reviewItems[0].moderation.confidence).toBe(0.95);
    expect(result.reviewItems[0].reports.totalReports).toBe(1);
  });
});

describe('DashboardService Aggregations Unit Tests', () => {
  it('should format aggregation results into DashboardDTO correctly', async () => {
    const dashboardService = new DashboardService();

    // Mock aggregates
    vi.mocked(EntryModel.aggregate).mockResolvedValueOnce([
      { _id: EntryStatus.PUBLISHED, count: 10 },
      { _id: EntryStatus.SHADOW_HIDDEN, count: 2 },
      { _id: EntryStatus.REMOVED, count: 3 },
    ]);
    vi.mocked(EntryModel.aggregate).mockResolvedValueOnce([{ total: 15 }]); // Helpful
    vi.mocked(ReportModel.aggregate).mockResolvedValueOnce([{ count: 20 }]); // Reports total
    vi.mocked(EntryModel.aggregate).mockResolvedValueOnce([{ count: 5 }]); // Submissions today
    vi.mocked(ReportModel.aggregate).mockResolvedValueOnce([{ count: 4 }]); // Reports today

    vi.mocked(EntryModel.aggregate).mockResolvedValueOnce([
      {
        submissionId: 'SUB-123',
        createdAt: new Date('2026-07-11T10:00:00Z'),
        waitingDuration: 5000,
      },
    ]); // Oldest pending

    vi.mocked(ModerationLogModel.aggregate).mockResolvedValueOnce([
      { approved: 4, total: 5 },
    ]); // Approval rate

    vi.mocked(ModerationLogModel.aggregate).mockResolvedValueOnce([
      { avgDuration: 12000 },
    ]); // Average duration

    const result = await dashboardService.getDashboardStats();

    expect(result.overview.totalEntries).toBe(15);
    expect(result.overview.published).toBe(10);
    expect(result.overview.shadowHidden).toBe(2);
    expect(result.overview.removed).toBe(3);
    expect(result.moderation.pendingReview).toBe(2);
    expect(result.moderation.approvalRate).toBe(80);
    expect(result.moderation.averageModerationTime).toBe(12);
    expect(result.today.submissionsToday).toBe(5);
    expect(result.today.reportsToday).toBe(4);
    expect(result.activity.totalHelpful).toBe(15);
    expect(result.activity.totalReports).toBe(20);
    expect(result.activity.oldestPendingSubmission?.submissionId).toBe('SUB-123');
  });
});
