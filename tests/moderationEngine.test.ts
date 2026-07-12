import { describe, expect, it, vi } from 'vitest';
import { ModerationEngine } from '../src/modules/moderation/moderationEngine';
import { EntryStatus } from '../src/modules/entries/entries.constants';
import { Entry } from '../src/modules/entries/entries.types';
import { DuplicateRule } from '../src/modules/moderation/moderation.rules';
import { RuleResult } from '../src/shared/types';
import { EntryModel } from '../src/modules/entries/entries.model';

vi.mock('../src/modules/entries/entries.model', () => {
  const mockQuery = {
    sort: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue([]),
  };
  return {
    EntryModel: {
      findOne: vi.fn().mockResolvedValue(null),
      find: vi.fn().mockReturnValue(mockQuery),
    },
    default: {
      findOne: vi.fn().mockResolvedValue(null),
      find: vi.fn().mockReturnValue(mockQuery),
    },
  };
});

describe('ModerationEngine', () => {
  it('should evaluate entry using all moderation rules and return resolved decision', async () => {
    const engine = new ModerationEngine();
    const entry: Partial<Entry> = {
      text: 'Capture this quiet wisdom.',
      author: 'Marcus Aurelius',
      source: 'Meditations',
    };
    const decision = await engine.evaluate(entry);

    // Placeholder rules all PASS, so final status must be published
    expect(decision.status).toBe(EntryStatus.PUBLISHED);
    expect(decision.confidence).toBe(1.0);
    expect(decision.triggeredRules).toEqual([]);
  });

  it('should flag duplicate entries using fuzzy matching (DuplicateRule)', async () => {
    const mockCandidates = [
      {
        _id: '507f1f77bcf86cd799439019',
        submissionId: 'SUB-123',
        text: 'Capture this quiet wisdom.',
        status: EntryStatus.PUBLISHED,
        helpfulCount: 0,
        reportCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    const mockQuery = {
      sort: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue(mockCandidates),
    };
    vi.spyOn(EntryModel, 'find').mockReturnValue(mockQuery as any);

    const rule = new DuplicateRule();
    
    // Test case-insensitive, punctuation-stripped matching
    const result1 = await rule.evaluate({ text: 'capture this quiet wisdom!' });
    expect(result1).toBe(RuleResult.WARN);

    const result2 = await rule.evaluate({ text: 'Capture   This   Quiet   Wisdom.' });
    expect(result2).toBe(RuleResult.WARN);

    const result3 = await rule.evaluate({ text: 'Different text altogether.' });
    expect(result3).toBe(RuleResult.PASS);
  });

  it('should safely fall back to WARN if any moderation rule throws an error', async () => {
    const engine = new ModerationEngine();
    
    // Force find to throw an error for all attempts (both text search and fallback)
    vi.spyOn(EntryModel, 'find').mockImplementation(() => {
      throw new Error('Database connection failed');
    });

    const entry = { text: 'Some innocent text.' };
    const decision = await engine.evaluate(entry);

    // Because DuplicateRule fails (due to DB error), it should default to WARN
    // DecisionResolver resolves any WARN to SHADOW_HIDDEN
    expect(decision.status).toBe(EntryStatus.SHADOW_HIDDEN);
    expect(decision.confidence).toBe(0.8);
    expect(decision.triggeredRules).toContain('DuplicateRule');
  });
});
