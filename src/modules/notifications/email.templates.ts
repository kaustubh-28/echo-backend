export const emailTemplates = {
  submissionReceived: (submissionId: string, textPreview: string) => ({
    subject: `Submission Received - ID: ${submissionId}`,
    body: `We have received your submission (ID: ${submissionId}).\n\nContent:\n"${textPreview}"\n\nIt is currently being reviewed. You can check the status using your submission ID.`,
  }),

  submissionApproved: (submissionId: string) => ({
    subject: `Submission Approved - ID: ${submissionId}`,
    body: `Good news! Your submission (ID: ${submissionId}) has been reviewed and approved. It is now published!`,
  }),

  submissionRemoved: (submissionId: string, reason?: string) => ({
    subject: `Submission Removed - ID: ${submissionId}`,
    body: `Your submission (ID: ${submissionId}) has been removed.\n\nReason: ${reason || 'Does not comply with our guidelines.'}`,
  }),
};
