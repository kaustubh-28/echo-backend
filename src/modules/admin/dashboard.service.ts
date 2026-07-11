import { EntryModel } from '../entries/entries.model';
import { ReportModel } from '../entries/report.model';
import { ModerationLogModel } from '../moderation/moderationLog.model';
import { EntryStatus } from '../entries/entries.constants';
import { ModerationAction } from '@shared/types';
import { DashboardDTO } from './dto/dashboard.dto';

export class DashboardService {
  async getDashboardStats(): Promise<DashboardDTO> {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    // 1. Overview & Activity metrics using Aggregation pipelines
    const statusCountsAgg = await EntryModel.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);
    const overviewCounts = {
      published: 0,
      shadowHidden: 0,
      removed: 0,
      total: 0,
    };
    for (const res of statusCountsAgg) {
      if (res._id === EntryStatus.PUBLISHED) overviewCounts.published = res.count;
      else if (res._id === EntryStatus.SHADOW_HIDDEN) overviewCounts.shadowHidden = res.count;
      else if (res._id === EntryStatus.REMOVED) overviewCounts.removed = res.count;
      overviewCounts.total += res.count;
    }

    // 2. Average helpful count aggregation
    const helpfulAgg = await EntryModel.aggregate([
      { $group: { _id: null, total: { $sum: '$helpfulCount' } } },
    ]);
    const totalHelpful = helpfulAgg[0]?.total || 0;

    // 3. Reports count aggregation
    const reportsAgg = await ReportModel.aggregate([{ $count: 'count' }]);
    const totalReports = reportsAgg[0]?.count || 0;

    // 4. Submissions today aggregation
    const submissionsTodayAgg = await EntryModel.aggregate([
      { $match: { createdAt: { $gte: startOfDay } } },
      { $count: 'count' },
    ]);
    const submissionsToday = submissionsTodayAgg[0]?.count || 0;

    // 5. Reports today aggregation
    const reportsTodayAgg = await ReportModel.aggregate([
      { $match: { createdAt: { $gte: startOfDay } } },
      { $count: 'count' },
    ]);
    const reportsToday = reportsTodayAgg[0]?.count || 0;

    // 6. Oldest pending submission aggregation
    const oldestPendingAgg = await EntryModel.aggregate([
      { $match: { status: EntryStatus.SHADOW_HIDDEN } },
      { $sort: { createdAt: 1 } },
      { $limit: 1 },
      {
        $project: {
          submissionId: 1,
          createdAt: 1,
          waitingDuration: { $subtract: [new Date(), '$createdAt'] },
        },
      },
    ]);
    const oldestPendingSubmission = oldestPendingAgg[0]
      ? {
          submissionId: oldestPendingAgg[0].submissionId,
          createdAt: oldestPendingAgg[0].createdAt,
          waitingDuration: oldestPendingAgg[0].waitingDuration,
        }
      : null;

    // 7. Approval rate aggregation
    const approvalRateAgg = await ModerationLogModel.aggregate([
      {
        $match: {
          action: { $in: [ModerationAction.ADMIN_APPROVED, ModerationAction.ADMIN_REMOVED] },
        },
      },
      {
        $group: {
          _id: null,
          approved: {
            $sum: {
              $cond: [{ $eq: ['$action', ModerationAction.ADMIN_APPROVED] }, 1, 0],
            },
          },
          total: { $sum: 1 },
        },
      },
    ]);
    const approvalRate =
      approvalRateAgg.length > 0 && approvalRateAgg[0].total > 0
        ? (approvalRateAgg[0].approved / approvalRateAgg[0].total) * 100
        : 0;

    // 8. Average moderation time aggregation (using transition timestamps)
    const moderationTimes = await ModerationLogModel.aggregate([
      {
        $match: {
          action: {
            $in: [
              ModerationAction.AUTO_HIDDEN,
              ModerationAction.REPORT_THRESHOLD,
              ModerationAction.ADMIN_APPROVED,
              ModerationAction.ADMIN_REMOVED,
            ],
          },
        },
      },
      {
        $group: {
          _id: '$entryId',
          hiddenAt: {
            $min: {
              $cond: [
                {
                  $in: [
                    '$action',
                    [ModerationAction.AUTO_HIDDEN, ModerationAction.REPORT_THRESHOLD],
                  ],
                },
                '$createdAt',
                null,
              ],
            },
          },
          moderatedAt: {
            $max: {
              $cond: [
                {
                  $in: [
                    '$action',
                    [ModerationAction.ADMIN_APPROVED, ModerationAction.ADMIN_REMOVED],
                  ],
                },
                '$createdAt',
                null,
              ],
            },
          },
        },
      },
      {
        $match: {
          hiddenAt: { $ne: null },
          moderatedAt: { $ne: null },
        },
      },
      {
        $project: {
          duration: { $subtract: ['$moderatedAt', '$hiddenAt'] },
        },
      },
      {
        $group: {
          _id: null,
          avgDuration: { $avg: '$duration' },
        },
      },
    ]);
    // Duration from subtract is in milliseconds; return in seconds
    const averageModerationTime =
      moderationTimes.length > 0 && moderationTimes[0].avgDuration
        ? moderationTimes[0].avgDuration / 1000
        : 0;

    return {
      overview: {
        totalEntries: overviewCounts.total,
        published: overviewCounts.published,
        shadowHidden: overviewCounts.shadowHidden,
        removed: overviewCounts.removed,
      },
      moderation: {
        pendingReview: overviewCounts.shadowHidden,
        approvalRate,
        averageModerationTime,
      },
      today: {
        submissionsToday,
        reportsToday,
      },
      activity: {
        totalHelpful,
        totalReports,
        oldestPendingSubmission,
      },
    };
  }
}

export default DashboardService;
