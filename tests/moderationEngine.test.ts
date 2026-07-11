import { describe, expect, it, vi } from 'vitest';
import { ModerationEngine } from '../src/modules/moderation/moderationEngine';
import { EntryStatus } from '../src/modules/entries/entries.constants';
import { Entry } from '../src/modules/entries/entries.types';

vi.mock('../src/modules/entries/entries.model', () => {
  return {
    EntryModel: {
      findOne: vi.fn().mockResolvedValue(null),
    },
    default: {
      findOne: vi.fn().mockResolvedValue(null),
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
});
