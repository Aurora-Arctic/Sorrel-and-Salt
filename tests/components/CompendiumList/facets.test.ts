import { describe, expect, it } from 'vitest';
import {
  compendiumFacetCounts,
  covenFacetCounts,
  type FacetVocabularies,
} from '@/components/CompendiumList/facets';
import type { CompendiumCategoryChoice } from '@/components/CompendiumList/types';
import type { CompendiumFacets, WorkspaceIngredientFacets } from '@/modules/ingredients';

// The service's counts name a deity or a category by id and a form by its
// spelling; the list's props name them by what the address and a chip carry
// . Plain maps stand in for the vocabularies the page reads.
const GROUP = { id: 'g-1', name: 'Fixture Wards', colorDark: '#4e8bc2', colorLight: '#0c5393' };
const WARD: CompendiumCategoryChoice = {
  id: 'c-1',
  slug: 'testward',
  name: 'Testward',
  group: GROUP,
};
const CRAFT: CompendiumCategoryChoice = {
  id: 'c-2',
  slug: 'testcraft',
  name: 'Testcraft',
  group: GROUP,
};

const VOCABULARIES: FacetVocabularies = {
  formIcons: new Map([['fixture oil', 'fluid']]),
  deities: new Map([
    ['d-1', { slug: 'testa-greek', name: 'Testa', tradition: 'Fixture Greek' }],
    ['d-2', { slug: 'testa-roman', name: 'Testa', tradition: 'Fixture Roman' }],
    ['d-3', { slug: 'fixtura-greek', name: 'Fixtura', tradition: 'Fixture Greek' }],
  ]),
  categories: new Map([
    ['c-1', WARD],
    ['c-2', CRAFT],
  ]),
};

const EMPTY: CompendiumFacets = {
  forms: [],
  deities: [],
  categories: [],
  zodiacSigns: [],
  celestialBodies: [],
  elements: [],
  toxic: [],
  withoutReferences: 0,
  withoutForms: 0,
  reviewed: null,
};

describe('the facet counts as the list takes them', () => {
  it('names a form by its text and gives it its curated group icon, null for an uncurated one', () => {
    const { forms } = compendiumFacetCounts(
      {
        ...EMPTY,
        forms: [
          { value: 'Fixture Oil', count: 3 },
          { value: 'Uncurated', count: 1 },
        ],
      },
      VOCABULARIES,
    );
    expect(forms).toEqual([
      { value: 'Fixture Oil', label: 'Fixture Oil', count: 3, icon: 'fluid' },
      { value: 'Uncurated', label: 'Uncurated', count: 1, icon: null },
    ]);
  });

  it('matches a form to its icon whatever its case', () => {
    const { forms } = compendiumFacetCounts(
      { ...EMPTY, forms: [{ value: 'FIXTURE OIL', count: 1 }] },
      VOCABULARIES,
    );
    expect(forms[0].icon).toBe('fluid');
  });

  it('turns a deity id into its slug, and tells two of one name apart by tradition', () => {
    const { deities } = compendiumFacetCounts(
      {
        ...EMPTY,
        deities: [
          { value: 'd-1', count: 2 },
          { value: 'd-2', count: 2 },
        ],
      },
      VOCABULARIES,
    );
    expect(deities.map(({ value, label, tradition }) => ({ value, label, tradition }))).toEqual([
      { value: 'testa-greek', label: 'Testa', tradition: 'Fixture Greek' },
      { value: 'testa-roman', label: 'Testa', tradition: 'Fixture Roman' },
    ]);
  });

  it('turns a category id into its slug, with its group colours', () => {
    const { categories } = compendiumFacetCounts(
      { ...EMPTY, categories: [{ value: 'c-2', count: 4 }] },
      VOCABULARIES,
    );
    expect(categories).toEqual([
      { value: 'testcraft', label: 'Testcraft', count: 4, group: GROUP },
    ]);
  });

  // The service sorts every list in SQL, so the list keeps the order
  // it is given. Each input below is in neither count order nor label order,
  // so a re-sort by either would read differently.
  it('keeps forms, deities and categories in the order given, whatever their counts and labels', () => {
    const counts = compendiumFacetCounts(
      {
        ...EMPTY,
        forms: [
          { value: 'Zed', count: 0 },
          { value: 'Beta', count: 2 },
          { value: 'Alpha', count: 2 },
          { value: 'Gamma', count: 5 },
        ],
        deities: [
          { value: 'd-1', count: 1 },
          { value: 'd-2', count: 4 },
          { value: 'd-3', count: 2 },
        ],
        categories: [
          { value: 'c-1', count: 1 },
          { value: 'c-2', count: 3 },
        ],
      },
      VOCABULARIES,
    );
    expect(counts.forms.map(({ value }) => value)).toEqual(['Zed', 'Beta', 'Alpha', 'Gamma']);
    expect(counts.deities.map(({ value }) => value)).toEqual([
      'testa-greek',
      'testa-roman',
      'fixtura-greek',
    ]);
    expect(counts.categories.map(({ value }) => value)).toEqual(['testward', 'testcraft']);
  });

  it('drops a deity or category the vocabulary no longer holds, and keeps the rest', () => {
    const counts = compendiumFacetCounts(
      {
        ...EMPTY,
        deities: [
          { value: 'gone', count: 9 },
          { value: 'd-1', count: 1 },
        ],
        categories: [
          { value: 'gone', count: 9 },
          { value: 'c-1', count: 1 },
        ],
      },
      VOCABULARIES,
    );
    expect(counts.deities.map(({ value }) => value)).toEqual(['testa-greek']);
    expect(counts.categories.map(({ value }) => value)).toEqual(['testward']);
  });

  it('keeps signs and celestial bodies by name in the order given, and zeros with them', () => {
    const counts = compendiumFacetCounts(
      {
        ...EMPTY,
        zodiacSigns: [
          { value: 'Aries', count: 0 },
          { value: 'Taurus', count: 2 },
        ],
        celestialBodies: [{ value: 'Sun', count: 1 }],
      },
      VOCABULARIES,
    );
    expect(counts.zodiac).toEqual([
      { value: 'Aries', label: 'Aries', count: 0 },
      { value: 'Taurus', label: 'Taurus', count: 2 },
    ]);
    expect(counts.celestialBodies).toEqual([{ value: 'Sun', label: 'Sun', count: 1 }]);
  });

  it('keeps elements and both toxic settings with their counts, and the No Refs count', () => {
    const counts = compendiumFacetCounts(
      {
        ...EMPTY,
        elements: [
          { value: 'fire', count: 0 },
          { value: 'earth', count: 3 },
        ],
        toxic: [
          { value: 'toxic', count: 1 },
          { value: 'not_toxic', count: 4 },
        ],
        withoutReferences: 7,
        withoutForms: 5,
      },
      VOCABULARIES,
    );
    expect(counts.elements.map(({ value, count }) => [value, count])).toEqual([
      ['fire', 0],
      ['earth', 3],
    ]);
    expect(counts.toxic.map(({ value, count }) => [value, count])).toEqual([
      ['toxic', 1],
      ['not_toxic', 4],
    ]);
    expect(counts.withoutReferences).toBe(7);
    expect(counts.withoutForms).toBe(5);
  });

  it('names both review settings with their counts for a curator, and leaves the strip off without them (M14.8)', () => {
    const counts = compendiumFacetCounts(
      {
        ...EMPTY,
        reviewed: [
          { value: 'reviewed', count: 2 },
          { value: 'needs_review', count: 0 },
        ],
      },
      VOCABULARIES,
    );
    expect(counts.reviewed).toEqual([
      { value: 'reviewed', label: 'Reviewed', count: 2 },
      { value: 'needs_review', label: 'Needs Review', count: 0 },
    ]);
    expect(compendiumFacetCounts(EMPTY, VOCABULARIES)).not.toHaveProperty('reviewed');
  });
});

describe("a coven's facet counts as its panel takes them (M9.7)", () => {
  const covenCounts: WorkspaceIngredientFacets = {
    ...EMPTY,
    source: [
      { value: 'local', count: 4 },
      { value: 'compendium', count: 0 },
    ],
    inStock: 3,
    lowStockOnly: 2,
  };

  it('carries both Source values, zero kept, and the In Stock count beside the shared kinds', () => {
    const counts = covenFacetCounts(
      { ...covenCounts, toxic: [{ value: 'toxic', count: 2 }] },
      VOCABULARIES,
    );

    expect(counts.source?.map(({ value, count }) => [value, count])).toEqual([
      ['local', 4],
      ['compendium', 0],
    ]);
    expect(counts.inStock).toBe(3);
    expect(counts.lowStockOnly).toBe(2);
    expect(counts.toxic.map(({ value, count }) => [value, count])).toEqual([['toxic', 2]]);
  });

  it("leaves both off the compendium's counts, which have no source or jars", () => {
    const counts = compendiumFacetCounts(EMPTY, VOCABULARIES);
    expect(counts).not.toHaveProperty('source');
    expect(counts).not.toHaveProperty('inStock');
    expect(counts).not.toHaveProperty('lowStockOnly');
  });
});
