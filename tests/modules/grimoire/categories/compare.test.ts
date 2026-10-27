import { describe, expect, it } from 'vitest';
import { compareSpellCategories } from '@/modules/grimoire';

describe('compareSpellCategories', () => {
  it('reports intended categories that no ingredient carries', () => {
    expect(compareSpellCategories(['prosperity', 'love'], ['love'])).toEqual({
      intendedNotPresent: ['prosperity'],
      presentNotIntended: [],
    });
  });

  it('reports ingredient categories outside the stated intent', () => {
    expect(compareSpellCategories(['love'], ['love', 'psychic work'])).toEqual({
      intendedNotPresent: [],
      presentNotIntended: ['psychic work'],
    });
  });

  it('reports both directions at once, each in its own list', () => {
    expect(compareSpellCategories(['a', 'b'], ['b', 'c'])).toEqual({
      intendedNotPresent: ['a'],
      presentNotIntended: ['c'],
    });
  });

  it('returns both lists empty when the sets match, whatever the order', () => {
    expect(compareSpellCategories(['a', 'b'], ['b', 'a'])).toEqual({
      intendedNotPresent: [],
      presentNotIntended: [],
    });
  });

  it('reports every present category when nothing is intended, and the reverse', () => {
    expect(compareSpellCategories([], ['a', 'b'])).toEqual({
      intendedNotPresent: [],
      presentNotIntended: ['a', 'b'],
    });
    expect(compareSpellCategories(['a', 'b'], [])).toEqual({
      intendedNotPresent: ['a', 'b'],
      presentNotIntended: [],
    });
  });

  it('lists each category once, in the order it first appears', () => {
    expect(compareSpellCategories(['z', 'y', 'z'], ['x', 'w', 'x'])).toEqual({
      intendedNotPresent: ['z', 'y'],
      presentNotIntended: ['x', 'w'],
    });
  });
});
