import { describe, expect, it } from 'vitest';
import { moved } from '@/components/HelpOutline/move-buttons';

// A move writes the guide's whole order back, so the new order is every sub page with one pair swapped.

const ORDER = ['a', 'b', 'c', 'd'] as const;

describe('moved', () => {
  it('swaps an entry with the one above it on Move Up', () => {
    expect(moved(ORDER, 2, -1)).toEqual(['a', 'c', 'b', 'd']);
  });

  it('swaps an entry with the one below it on Move Down', () => {
    expect(moved(ORDER, 1, 1)).toEqual(['a', 'c', 'b', 'd']);
  });

  it('moves the first entry down and the last entry up', () => {
    expect(moved(ORDER, 0, 1)).toEqual(['b', 'a', 'c', 'd']);
    expect(moved(ORDER, 3, -1)).toEqual(['a', 'b', 'd', 'c']);
  });

  it('keeps every entry, and leaves the order it was given alone', () => {
    const order = [...ORDER];

    const next = moved(order, 1, 1);

    expect([...next].sort()).toEqual([...ORDER]);
    expect(order).toEqual([...ORDER]);
  });
});
