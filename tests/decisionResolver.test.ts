import { describe, expect, it } from 'vitest';
import { DecisionResolver } from '../src/modules/moderation/decisionResolver';
import { RuleResult } from '../src/shared/types';
import { EntryStatus } from '../src/modules/entries/entries.constants';

describe('DecisionResolver', () => {
  const resolver = new DecisionResolver();

  it('should return published status if all results are PASS', () => {
    const results = [RuleResult.PASS, RuleResult.PASS];
    const decision = resolver.resolve(results);
    expect(decision.status).toBe(EntryStatus.PUBLISHED);
    expect(decision.confidence).toBe(1.0);
    expect(decision.triggeredRules).toEqual([]);
  });

  it('should return removed status if any result is FAIL', () => {
    const results = [RuleResult.PASS, RuleResult.FAIL, RuleResult.WARN];
    const decision = resolver.resolve(results, ['ProfanityRule', 'SpamRule', 'LengthRule']);
    expect(decision.status).toBe(EntryStatus.REMOVED);
    expect(decision.confidence).toBe(1.0);
    expect(decision.triggeredRules).toContain('SpamRule');
  });

  it('should return shadow_hidden status if any result is WARN and no result is FAIL', () => {
    const results = [RuleResult.PASS, RuleResult.WARN];
    const decision = resolver.resolve(results, ['ProfanityRule', 'SpamRule']);
    expect(decision.status).toBe(EntryStatus.SHADOW_HIDDEN);
    expect(decision.confidence).toBe(0.8);
    expect(decision.triggeredRules).toContain('SpamRule');
  });
});
