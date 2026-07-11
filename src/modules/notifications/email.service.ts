import { EmailPayload, EmailProvider } from './email.types';
import { emailTemplates } from './email.templates';
import { log } from '@shared/logger/requestContext';

export class ConsoleEmailProvider implements EmailProvider {
  async sendEmail(payload: EmailPayload): Promise<void> {
    log.info('[Email Sent (Console Mock)]', {
      to: payload.to,
      subject: payload.subject,
      body: payload.body,
    });
  }
}

export class EmailService {
  constructor(private readonly emailProvider: EmailProvider) {}

  async sendSubmissionReceived(to: string, submissionId: string, text: string): Promise<void> {
    try {
      const textPreview = text.length > 50 ? `${text.substring(0, 47)}...` : text;
      const { subject, body } = emailTemplates.submissionReceived(submissionId, textPreview);
      await this.emailProvider.sendEmail({ to, subject, body });
    } catch (error) {
      log.error(error, 'Failed to send submission received email', { submissionId, to });
      throw error;
    }
  }

  async sendSubmissionApproved(to: string, submissionId: string): Promise<void> {
    try {
      const { subject, body } = emailTemplates.submissionApproved(submissionId);
      await this.emailProvider.sendEmail({ to, subject, body });
    } catch (error) {
      log.error(error, 'Failed to send submission approved email', { submissionId, to });
      throw error;
    }
  }

  async sendSubmissionRemoved(to: string, submissionId: string, reason?: string): Promise<void> {
    try {
      const { subject, body } = emailTemplates.submissionRemoved(submissionId, reason);
      await this.emailProvider.sendEmail({ to, subject, body });
    } catch (error) {
      log.error(error, 'Failed to send submission removed email', { submissionId, to });
      throw error;
    }
  }
}

export default EmailService;
