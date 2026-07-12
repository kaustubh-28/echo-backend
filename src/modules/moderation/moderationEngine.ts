import { ModerationDecision, RuleResult } from '@shared/types';
import { Entry } from '../entries/entries.types';
import {
  ProfanityRule,
  SpamRule,
  DuplicateRule,
  LengthRule,
  ModerationRule,
} from './moderation.rules';
import { DecisionResolver } from './decisionResolver';
import { log } from '@shared/logger/requestContext';

export class ModerationEngine {
  private readonly rules: ModerationRule[];
  private readonly resolver: DecisionResolver;

  constructor() {
    this.rules = [
      new ProfanityRule(),
      new SpamRule(),
      new DuplicateRule(),
      new LengthRule(),
    ];
    this.resolver = new DecisionResolver();
  }

  async evaluate(entry: Partial<Entry>): Promise<ModerationDecision> {
    const results = await Promise.all(
      this.rules.map(async (rule) => {
        try {
          return await rule.evaluate(entry);
        } catch (error) {
          log.error(error, `Moderation rule ${rule.name} failed to evaluate. Defaulting to WARN.`, {
            rule: rule.name,
            entryId: entry.id,
            submissionId: entry.submissionId,
          });
          return RuleResult.WARN;
        }
      })
    );
    const ruleNames = this.rules.map((rule) => rule.name);
    return this.resolver.resolve(results, ruleNames);
  }
}
