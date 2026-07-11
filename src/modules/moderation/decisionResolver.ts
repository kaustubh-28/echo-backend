import { RuleResult, ModerationDecision } from '@shared/types';
import { EntryStatus } from '../entries/entries.constants';

export class DecisionResolver {
  resolve(results: RuleResult[], ruleNames: string[] = []): ModerationDecision {
    const hasFail = results.includes(RuleResult.FAIL);
    const hasWarn = results.includes(RuleResult.WARN);

    const triggeredRules: string[] = [];
    results.forEach((res, i) => {
      if (res !== RuleResult.PASS) {
        triggeredRules.push(ruleNames[i] || `Rule-${i}`);
      }
    });

    if (hasFail) {
      return {
        status: EntryStatus.REMOVED,
        confidence: 1.0,
        triggeredRules,
        reason: 'Automated policy violation check failed.',
      };
    }

    if (hasWarn) {
      return {
        status: EntryStatus.SHADOW_HIDDEN,
        confidence: 0.8,
        triggeredRules,
        reason: 'Automated check flagged warnings.',
      };
    }

    return {
      status: EntryStatus.PUBLISHED,
      confidence: 1.0,
      triggeredRules: [],
    };
  }
}
