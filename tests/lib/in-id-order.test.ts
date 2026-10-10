import { describe, expect, it } from 'vitest';
import { inIdOrder } from '@/lib/in-id-order';

// A DataLoader's batch answered one slot per id, in the ids' order (MB.210).

describe('inIdOrder', () => {
  const rows = [
    { id: 'b', name: 'second' },
    { id: 'a', name: 'first' },
  ];

  it('answers each id with its row, in the order given, a repeat included', () => {
    expect(inIdOrder(['a', 'b', 'a'], rows, () => null)).toEqual([rows[1], rows[0], rows[1]]);
  });

  it('answers an id no row carries with what `missing` makes of it', () => {
    expect(inIdOrder(['a', 'gone'], rows, (id) => `no ${id}`)).toEqual([rows[1], 'no gone']);
  });
});
