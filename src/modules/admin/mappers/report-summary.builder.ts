import { IReportDocument } from '../../entries/report.model';
import { ReportSummaryDTO } from '../dto/review.dto';

export class ReportSummaryBuilder {
  static build(reports: IReportDocument[]): ReportSummaryDTO {
    const totalReports = reports.length;

    const reasonBreakdown: Record<string, number> = {};
    for (const r of reports) {
      const reason = r.reason.toLowerCase();
      reasonBreakdown[reason] = (reasonBreakdown[reason] || 0) + 1;
    }

    const sortedReportsDesc = [...reports]
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 5);

    const latestReports = sortedReportsDesc.map((r) => ({
      id: r._id.toString(),
      reason: r.reason,
      createdAt: r.createdAt,
    }));

    return {
      totalReports,
      reasonBreakdown,
      latestReports,
    };
  }
}

export default ReportSummaryBuilder;
