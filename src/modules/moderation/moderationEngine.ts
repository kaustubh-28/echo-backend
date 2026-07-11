import { ModerationDecision } from '@shared/types';
import { Entry } from '../entries/entries.types';
import {
  ProfanityRule,
  SpamRule,
  DuplicateRule,
  LengthRule,
  ModerationRule,
} from './moderation.rules';
import { DecisionResolver } from './decisionResolver';

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
      this.rules.map((rule) => rule.evaluate(entry))
    );
    const ruleNames = this.rules.map((rule) => rule.name);
    return this.resolver.resolve(results, ruleNames);
  }
}
