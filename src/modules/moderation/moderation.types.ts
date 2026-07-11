export enum ModerationDecision {
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  FLAGGED = 'FLAGGED',
}

export interface ModerationResult {
  decision: ModerationDecision;
  reason?: string;
}
