import { describe, expect, it } from 'vitest';
import { COMPENDIUM_PARAMS } from '@/components/CompendiumList/params';
import { GRIMOIRE_PARAMS } from '@/components/GrimoireList/params';

// The grimoire's search (M10.11) is three of the compendium's entries, taken as they
// are: the search text and the category filter with its match mode. Status is the
// tab's, Spells or Drafts, so the address carries none.
const PATH = '/coven/test-coven/grimoire';
const LOOKUPS = { categories: new Map([['protection', 'cat-1']]) };

describe('the grimoire parameter table', () => {
  it('is the compendium search text and category filter, and nothing else', () => {
    expect(Object.keys(GRIMOIRE_PARAMS.entries).sort()).toEqual(
      ['categories', 'categoryMode', 'query'].sort(),
    );
    for (const key of ['query', 'categories', 'categoryMode'] as const) {
      expect(GRIMOIRE_PARAMS.entries[key]).toBe(COMPENDIUM_PARAMS.entries[key]);
    }
  });

  it('reads no status from the address, which the tab sets', () => {
    expect(GRIMOIRE_PARAMS.read({ status: 'draft', forms: 'Oil' })).toEqual(
      GRIMOIRE_PARAMS.read({}),
    );
  });

  it('round-trips a search and a category through the address', () => {
    const href = GRIMOIRE_PARAMS.href(PATH, {
      query: 'hearth',
      categories: ['protection'],
      categoryMode: 'any',
    });
    const filter = GRIMOIRE_PARAMS.read(
      Object.fromEntries(new URL(`http://x${href}`).searchParams),
    );
    expect(filter).toEqual({ query: 'hearth', categories: ['protection'], categoryMode: 'any' });
  });

  it('becomes the grimoire query variables, the category slugs as ids', () => {
    const filter = { query: 'hearth', categories: ['protection'], categoryMode: 'any' as const };
    expect(GRIMOIRE_PARAMS.variables(filter, LOOKUPS)).toEqual({
      query: 'hearth',
      categoryIds: ['cat-1'],
      categoryMode: 'any',
    });
  });
});
