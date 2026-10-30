import { describe, expect, it } from 'vitest';
import { skipSummary } from '@/components/RecordWorking/warnings';

describe('skipSummary', () => {
  it('counts the items completing would leave out of inventory in one line', () => {
    expect(skipSummary(4)).toBe('Completing does not affect inventory for 4 items');
    expect(skipSummary(1)).toBe('Completing does not affect inventory for 1 item');
  });

  it('says nothing when no step is skipped', () => {
    expect(skipSummary(0)).toBeNull();
  });
});
