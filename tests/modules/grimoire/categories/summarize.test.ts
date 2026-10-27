import { describe, expect, it } from 'vitest';
import { summarizeSpellCategories } from '@/modules/grimoire';

describe('summarizeSpellCategories', () => {
  it('returns each category once when ingredients share it', () => {
    const result = summarizeSpellCategories([
      { ingredientId: 'i1', categoryIds: ['love', 'luck'] },
      { ingredientId: 'i2', categoryIds: ['luck', 'protection'] },
      { ingredientId: 'i3', categoryIds: ['love', 'love'] },
    ]);
    expect(result).toHaveLength(3);
    expect(new Set(result)).toEqual(new Set(['love', 'luck', 'protection']));
  });

  it('returns empty for an empty step list', () => {
    expect(summarizeSpellCategories([])).toEqual([]);
  });

  it('skips a step with no ingredient id even if it carries categories', () => {
    expect(summarizeSpellCategories([{ ingredientId: null, categoryIds: ['love'] }])).toEqual([]);
  });

  it('counts only the linked steps when custom rows sit among them', () => {
    expect(
      summarizeSpellCategories([
        { ingredientId: null, categoryIds: ['love'] },
        { ingredientId: 'i1', categoryIds: ['luck'] },
        { ingredientId: null, categoryIds: ['protection'] },
      ]),
    ).toEqual(['luck']);
  });

  it('returns empty for a linked ingredient with no categories', () => {
    expect(summarizeSpellCategories([{ ingredientId: 'i1', categoryIds: [] }])).toEqual([]);
  });

  it('orders by first appearance, the same on every call', () => {
    const steps = [
      { ingredientId: 'i1', categoryIds: ['b', 'a'] },
      { ingredientId: 'i2', categoryIds: ['c', 'a'] },
    ];
    expect(summarizeSpellCategories(steps)).toEqual(['b', 'a', 'c']);
    expect(summarizeSpellCategories(steps)).toEqual(['b', 'a', 'c']);
  });

  it('does not change its input', () => {
    const steps = [{ ingredientId: 'i1', categoryIds: ['a', 'a'] }];
    summarizeSpellCategories(steps);
    expect(steps).toEqual([{ ingredientId: 'i1', categoryIds: ['a', 'a'] }]);
  });
});
