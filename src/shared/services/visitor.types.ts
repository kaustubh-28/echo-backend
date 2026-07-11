export const VISITOR_COOKIE_NAME = 'echo_visitor';

/** Two years in milliseconds */
export const VISITOR_COOKIE_MAX_AGE_MS = 2 * 365 * 24 * 60 * 60 * 1000;

export interface AnonymousVisitor {
  visitorId: string;
  visitorHash: string;
  isNewVisitor: boolean;
}
