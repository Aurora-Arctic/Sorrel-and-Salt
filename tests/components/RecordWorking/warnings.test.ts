import { describe, expect, it } from 'vitest';
import { skipSummary } from '@/components/RecordWorking/warnings';

describe('skipSummary', () => {
  it('counts the steps completing would skip in one line', () => {
    expect(skipSummary(4)).toBe('Completing skips 4 steps');
    expect(skipSummary(1)).toBe('Completing skips 1 step');
  });

  it('says nothing when no step is skipped', () => {
    expect(skipSummary(0)).toBeNull();
  });
});
