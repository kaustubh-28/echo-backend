import { EntryStatus } from '@modules/entries/entries.constants';

export enum ModerationAction {
  SUBMITTED = 'SUBMITTED',
  AUTO_APPROVED = 'AUTO_APPROVED',
  AUTO_HIDDEN = 'AUTO_HIDDEN',
  AUTO_REJECTED = 'AUTO_REJECTED',
  REPORT_THRESHOLD = 'REPORT_THRESHOLD',
  ADMIN_APPROVED = 'ADMIN_APPROVED',
  ADMIN_REMOVED = 'ADMIN_REMOVED',
}

export enum RuleResult {
  PASS = 'PASS',
  WARN = 'WARN',
  FAIL = 'FAIL',
}

export interface ModerationDecision {
  status: EntryStatus;
  confidence: number;
  triggeredRules: string[];
  reason?: string;
}

export enum AdminAction {
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',
  REMOVE = 'REMOVE',
}

export interface ConfigDocument {
  key: string;
  value: string[];
}
