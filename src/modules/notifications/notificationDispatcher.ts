import { EmailService, ConsoleEmailProvider } from './email.service';

export class NotificationDispatcher {
  constructor(
    private readonly emailService: EmailService = new EmailService(new ConsoleEmailProvider())
  ) {}

  async submissionReceived(to: string, submissionId: string, text: string): Promise<void> {
    await this.emailService.sendSubmissionReceived(to, submissionId, text);
  }

  async submissionApproved(to: string, submissionId: string): Promise<void> {
    await this.emailService.sendSubmissionApproved(to, submissionId);
  }

  async submissionRemoved(to: string, submissionId: string, reason?: string): Promise<void> {
    await this.emailService.sendSubmissionRemoved(to, submissionId, reason);
  }
}
