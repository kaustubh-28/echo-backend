import { IModerationLogDocument } from '../../moderation/moderationLog.model';
import { TimelineItemDTO } from '../dto/review.dto';

export class TimelineMapper {
  static map(logs: IModerationLogDocument[], adminsMap: Map<string, string>): TimelineItemDTO[] {
    // Sort oldest -> newest (ascending by createdAt)
    const sortedLogs = [...logs].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

    return sortedLogs.map((log) => {
      const performedById = log.performedBy ? log.performedBy.toString() : null;
      const performedBy = performedById ? adminsMap.get(performedById) || performedById : null;

      return {
        action: log.action,
        oldStatus: log.oldStatus || null,
        newStatus: log.newStatus,
        reason: log.reason || null,
        performedBy,
        createdAt: log.createdAt,
      };
    });
  }
}

export default TimelineMapper;
