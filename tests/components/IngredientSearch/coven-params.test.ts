import { describe, expect, it } from 'vitest';
import { COMPENDIUM_PARAMS } from '@/components/CompendiumList/params';
import { COVEN_PARAMS } from '@/components/IngredientSearch/coven-params';

// The coven's ingredient search is the compendium's table with two more
// entries, so adding them is the proof that a filter is one new entry
// (claude-docs/components/ingredient-search.md, "The parameter table").
const PATH = '/coven/test-coven/ingredients';
const BLANK = COVEN_PARAMS.read({});

describe('the coven parameter table', () => {
  it('keeps every compendium entry as it was, bar Reviewed, which is the curators alone', () => {
    const { reviewed: _reviewed, ...shared } = COMPENDIUM_PARAMS.entries;
    for (const [key, entry] of Object.entries(shared)) {
      expect(COVEN_PARAMS.entries[key as keyof typeof shared]).toBe(entry);
    }
    expect(Object.keys(COVEN_PARAMS.entries)).not.toContain('reviewed');
    expect(COVEN_PARAMS.read({ reviewed: '1' })).toEqual(BLANK);
  });

  it('leaves the compendium table without the coven filters', () => {
    expect(Object.keys(COMPENDIUM_PARAMS.entries)).not.toContain('source');
    expect(Object.keys(COMPENDIUM_PARAMS.entries)).not.toContain('inStock');
  });
});

describe('the source parameter', () => {
  const source = COVEN_PARAMS.entries.source;

  it('reads local or compendium, and anything else as both', () => {
    expect(source.read('local')).toBe('local');
    expect(source.read('compendium')).toBe('compendium');
    expect(source.read(undefined)).toBe('');
    expect(source.read('')).toBe('');
    expect(source.read('junk')).toBe('');
  });

  it('round-trips through the address, both being the address without it', () => {
    expect(COVEN_PARAMS.href(PATH, { source: 'local' })).toBe(`${PATH}?source=local`);
    expect(COVEN_PARAMS.href(PATH, { source: '' })).toBe(PATH);
    const filter = COVEN_PARAMS.read(
      Object.fromEntries(
        new URL(`http://x${COVEN_PARAMS.href(PATH, { source: 'compendium' })}`).searchParams,
      ),
    );
    expect(filter.source).toBe('compendium');
  });

  it('becomes the source variable, and no variable for both', () => {
    expect(COVEN_PARAMS.variables({ ...BLANK, source: 'local' })).toMatchObject({
      source: 'local',
    });
    expect(COVEN_PARAMS.variables({ ...BLANK, source: '' }).source).toBeUndefined();
  });
});

describe('the inStock parameter', () => {
  const inStock = COVEN_PARAMS.entries.inStock;

  it('reads 1 as on, and everything else as off', () => {
    expect(inStock.read('1')).toBe(true);
    expect(inStock.read(undefined)).toBe(false);
    expect(inStock.read('true')).toBe(false);
    expect(inStock.read('0')).toBe(false);
  });

  it('writes 1 when on and nothing when off, and reads it back', () => {
    expect(COVEN_PARAMS.href(PATH, { inStock: true })).toBe(`${PATH}?inStock=1`);
    expect(COVEN_PARAMS.href(PATH, { inStock: false })).toBe(PATH);
    expect(COVEN_PARAMS.read({ inStock: '1' }).inStock).toBe(true);
  });

  it('becomes the inStock variable only when on', () => {
    expect(COVEN_PARAMS.variables({ ...BLANK, inStock: true })).toMatchObject({
      inStock: true,
    });
    expect(COVEN_PARAMS.variables({ ...BLANK, inStock: false }).inStock).toBeUndefined();
  });

  it('sits beside the other filters in one address', () => {
    expect(
      COVEN_PARAMS.href(PATH, {
        query: 'wort',
        source: 'local',
        inStock: true,
        toxic: 'toxic',
      }),
    ).toBe(`${PATH}?query=wort&toxic=toxic&source=local&inStock=1`);
  });
});

describe('the lowStockOnly parameter', () => {
  const lowStockOnly = COVEN_PARAMS.entries.lowStockOnly;

  it('reads 1 as on, and everything else as off', () => {
    expect(lowStockOnly.read('1')).toBe(true);
    expect(lowStockOnly.read(undefined)).toBe(false);
    expect(lowStockOnly.read('true')).toBe(false);
    expect(lowStockOnly.read('0')).toBe(false);
  });

  it('writes 1 when on and nothing when off, and reads it back', () => {
    expect(COVEN_PARAMS.href(PATH, { lowStockOnly: true })).toBe(`${PATH}?lowStockOnly=1`);
    expect(COVEN_PARAMS.href(PATH, { lowStockOnly: false })).toBe(PATH);
    expect(COVEN_PARAMS.read({ lowStockOnly: '1' }).lowStockOnly).toBe(true);
  });

  it('becomes the lowStockOnly variable only when on', () => {
    expect(COVEN_PARAMS.variables({ ...BLANK, lowStockOnly: true })).toMatchObject({
      lowStockOnly: true,
    });
    expect(COVEN_PARAMS.variables({ ...BLANK, lowStockOnly: false }).lowStockOnly).toBeUndefined();
  });
});
