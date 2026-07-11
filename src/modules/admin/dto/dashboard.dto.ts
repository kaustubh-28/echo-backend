export interface DashboardDTO {
  overview: {
    totalEntries: number;
    published: number;
    shadowHidden: number;
    removed: number;
  };
  moderation: {
    pendingReview: number;
    approvalRate: number;
    averageModerationTime: number;
  };
  today: {
    submissionsToday: number;
    reportsToday: number;
  };
  activity: {
    totalHelpful: number;
    totalReports: number;
    oldestPendingSubmission: {
      submissionId: string;
      createdAt: Date;
      waitingDuration: number;
    } | null;
  };
}
