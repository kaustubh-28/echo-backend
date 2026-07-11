import { RuleResult } from '@shared/types';
import { Entry } from '../entries/entries.types';
import { EntriesRepository } from '../entries/entries.repository';
import { EntryStatus } from '../entries/entries.constants';

export interface ModerationRule {
  name: string;
  evaluate(entry: Partial<Entry>): Promise<RuleResult>;
}

export class ProfanityRule implements ModerationRule {
  readonly name = 'ProfanityRule';
  async evaluate(entry: Partial<Entry>): Promise<RuleResult> {
    if (!entry.text) return RuleResult.PASS;
    const text = entry.text.toLowerCase();
    const badWords = ['profanity', 'badword'];
    const hasProfanity = badWords.some((word) => text.includes(word));
    return hasProfanity ? RuleResult.FAIL : RuleResult.PASS;
  }
}

export class SpamRule implements ModerationRule {
  readonly name = 'SpamRule';
  async evaluate(entry: Partial<Entry>): Promise<RuleResult> {
    if (!entry.text) return RuleResult.PASS;
    const text = entry.text.toLowerCase();
    const spamWords = ['spam', 'buy now'];
    const isSpam = spamWords.some((word) => text.includes(word));
    return isSpam ? RuleResult.FAIL : RuleResult.PASS;
  }
}

export class DuplicateRule implements ModerationRule {
  readonly name = 'DuplicateRule';
  private readonly entriesRepository: EntriesRepository;

  constructor() {
    this.entriesRepository = new EntriesRepository();
  }

  async evaluate(entry: Partial<Entry>): Promise<RuleResult> {
    if (!entry.text) return RuleResult.PASS;
    if (typeof this.entriesRepository.findByTextAndStatus !== 'function') {
      return RuleResult.PASS;
    }
    const existing = await this.entriesRepository.findByTextAndStatus(entry.text, EntryStatus.PUBLISHED);
    return existing ? RuleResult.WARN : RuleResult.PASS;
  }
}

export class LengthRule implements ModerationRule {
  readonly name = 'LengthRule';
  async evaluate(entry: Partial<Entry>): Promise<RuleResult> {
    if (!entry.text) return RuleResult.FAIL;
    const len = entry.text.trim().length;
    if (len < 5 || len > 1000) {
      return RuleResult.FAIL;
    }
    return RuleResult.PASS;
  }
}
