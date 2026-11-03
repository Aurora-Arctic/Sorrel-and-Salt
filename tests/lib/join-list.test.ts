import { describe, expect, it } from 'vitest';
import { joinList } from '@/lib/join-list';

describe('joinList', () => {
  it('returns one item as it is', () => {
    expect(joinList(['sage'], 'and')).toBe('sage');
  });

  it('joins two items with the word and no comma', () => {
    expect(joinList(['sage', 'rue'], 'and')).toBe('sage and rue');
    expect(joinList(['sage', 'rue'], 'or')).toBe('sage or rue');
  });

  it('puts the Oxford comma before the word in a list of three or more', () => {
    expect(joinList(['sage', 'rue', 'thyme'], 'and')).toBe('sage, rue, and thyme');
    expect(joinList(['sage', 'rue', 'thyme', 'mint'], 'or')).toBe('sage, rue, thyme, or mint');
  });

  it('returns an empty string for no items', () => {
    expect(joinList([], 'and')).toBe('');
  });
});
