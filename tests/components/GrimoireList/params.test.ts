import { describe, expect, it } from 'vitest';
import { COMPENDIUM_PARAMS } from '@/components/CompendiumList/params';
import { GRIMOIRE_PARAMS } from '@/components/GrimoireList/params';

// The grimoire's search (M10.11, M13.22) is three of the compendium's entries, taken as they
// are (the search text and the category filter with its match mode), then four facets of its
// own: moon phase, day of week, visibility and the member who made the spell. Status is the
// tab's, Spells or Drafts, so the address carries none.
const EMPTY = { moonPhases: [], daysOfWeek: [], visibilities: [], makers: [] };
const MAKER = '00000000-0000-4000-8000-000000000001';
const PATH = '/coven/test-coven/grimoire';
const LOOKUPS = { categories: new Map([['protection', 'cat-1']]) };

describe('the grimoire parameter table', () => {
  it('is the compendium search text and category filter, then the four facets', () => {
    expect(Object.keys(GRIMOIRE_PARAMS.entries).sort()).toEqual(
      [
        'categories',
        'categoryMode',
        'daysOfWeek',
        'makers',
        'moonPhases',
        'query',
        'visibilities',
      ].sort(),
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
    expect(filter).toEqual({
      query: 'hearth',
      categories: ['protection'],
      categoryMode: 'any',
      ...EMPTY,
    });
  });

  it('becomes the grimoire query variables, the category slugs as ids', () => {
    const filter = {
      query: 'hearth',
      categories: ['protection'],
      categoryMode: 'any' as const,
      ...EMPTY,
    };
    expect(GRIMOIRE_PARAMS.variables(filter, LOOKUPS)).toEqual({
      query: 'hearth',
      categoryIds: ['cat-1'],
      categoryMode: 'any',
    });
  });

  it("round-trips the four facets, and becomes the service's filter fields", () => {
    const filter = {
      query: '',
      categories: [],
      categoryMode: 'all' as const,
      moonPhases: ['Waxing Crescent'],
      daysOfWeek: ['Friday', 'Monday'],
      visibilities: ['private' as const],
      makers: [MAKER],
    };
    const href = GRIMOIRE_PARAMS.href(PATH, filter);
    const read = GRIMOIRE_PARAMS.read(
      Object.fromEntries(
        [...new Set(new URL(`http://x${href}`).searchParams.keys())].map((key) => [
          key,
          new URL(`http://x${href}`).searchParams.getAll(key),
        ]),
      ),
    );
    expect(read).toEqual(filter);
    expect(GRIMOIRE_PARAMS.variables(filter, LOOKUPS)).toMatchObject({
      moonPhases: ['Waxing Crescent'],
      daysOfWeek: ['Friday', 'Monday'],
      visibilities: ['private'],
      makerIds: [MAKER],
    });
  });

  it('reads a visibility outside the pair and a maker that is not an id as no filter', () => {
    const read = GRIMOIRE_PARAMS.read({
      visibility: ['public'],
      maker: ['not-an-id', MAKER, MAKER],
    });
    expect(read.visibilities).toEqual([]);
    expect(read.makers).toEqual([MAKER]);
  });
});
