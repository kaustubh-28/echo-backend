export interface EmailPayload {
  to: string;
  subject: string;
  body: string;
}

export interface EmailProvider {
  sendEmail(payload: EmailPayload): Promise<void>;
}
