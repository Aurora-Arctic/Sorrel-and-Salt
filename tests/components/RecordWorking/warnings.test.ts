import { describe, expect, it } from 'vitest';
import { skipSummary } from '@/components/RecordWorking/warnings';

describe('skipSummary', () => {
  it('counts the ingredients completing would take nothing for, in one sentence', () => {
    expect(skipSummary(4)).toBe('Completing takes nothing from the jars for 4 ingredients.');
    expect(skipSummary(1)).toBe('Completing takes nothing from the jars for 1 ingredient.');
  });

  it('says nothing when no step is skipped', () => {
    expect(skipSummary(0)).toBeNull();
  });
});
