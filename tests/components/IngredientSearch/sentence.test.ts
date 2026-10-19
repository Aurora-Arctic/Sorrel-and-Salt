import { describe, expect, it } from 'vitest';
import { buildSearchSentence } from '@/components/IngredientSearch/sentence';
import type { SearchSentenceFilter } from '@/components/IngredientSearch/types';

// The one named exception to the copy rule (M12.4): this file asserts the
// sentence's strings, because the strings are what the function makes.

const empty: SearchSentenceFilter = {};

const text = (filter: SearchSentenceFilter, total: number, extra = {}) =>
  buildSearchSentence({ filter, total, ...extra })
    .fragments.map((f) => f.text)
    .join('');

describe('buildSearchSentence', () => {
  it('leads with the count: zero, one and many', () => {
    expect(text(empty, 0)).toBe('No ingredients');
    expect(text(empty, 1)).toBe('1 ingredient');
    expect(text(empty, 3)).toBe('3 ingredients');
  });

  it('takes the noun pair so another list can say the same', () => {
    expect(text(empty, 2, { noun: { one: 'entry', other: 'entries' } })).toBe('2 entries');
    expect(text(empty, 0, { noun: { one: 'entry', other: 'entries' } })).toBe('No entries');
  });

  it('gives only the count, and no chosen filter, for an empty filter', () => {
    const sentence = buildSearchSentence({ filter: empty, total: 5 });
    expect(sentence.fragments).toEqual([{ kind: 'text', text: '5 ingredients' }]);
    expect(sentence.hasFilter).toBe(false);
  });

  it('treats empty lists, a blank query and any toxic as nothing chosen', () => {
    const sentence = buildSearchSentence({
      filter: { query: '  ', forms: [], toxic: 'any', categoryMode: 'any' },
      total: 5,
    });
    expect(sentence.hasFilter).toBe(false);
  });

  it('joins two values with or and three with no serial comma', () => {
    const labels = { forms: { oil: 'Oil', resin: 'Resin', leaf: 'Leaf' } };
    expect(text({ forms: ['oil', 'resin'] }, 2, { labels })).toBe(
      '2 ingredients, in the form Oil or Resin',
    );
    expect(text({ forms: ['oil', 'resin', 'leaf'] }, 2, { labels })).toBe(
      '2 ingredients, in the form Oil, Resin or Leaf',
    );
  });

  it('puts the before Sun and Moon only', () => {
    const labels = { planets: { sun: 'Sun', moon: 'Moon', mars: 'Mars', venus: 'Venus' } };
    expect(text({ planets: ['sun', 'mars'] }, 4, { labels })).toBe(
      '4 ingredients, ruled by the Sun or Mars',
    );
    expect(text({ planets: ['venus', 'moon'] }, 4, { labels })).toBe(
      '4 ingredients, ruled by Venus or the Moon',
    );
  });

  it('says and for all-mode categories and or for any-mode', () => {
    const labels = { categories: { protection: 'Protection', healing: 'Healing' } };
    const categories = ['protection', 'healing'];
    expect(text({ categories }, 2, { labels })).toBe(
      '2 ingredients, in the Protection and Healing categories',
    );
    expect(text({ categories, categoryMode: 'all' }, 2, { labels })).toBe(
      '2 ingredients, in the Protection and Healing categories',
    );
    expect(text({ categories, categoryMode: 'any' }, 2, { labels })).toBe(
      '2 ingredients, in the Protection or Healing category',
    );
    expect(text({ categories: ['protection'] }, 2, { labels })).toBe(
      '2 ingredients, in the Protection category',
    );
  });

  it('writes the text query as matching', () => {
    expect(text({ query: 'rue' }, 1)).toBe('1 ingredient, matching “rue”');
    expect(text({ query: '  rue ' }, 1)).toBe('1 ingredient, matching “rue”');
  });

  it('says toxic each way and nothing for any', () => {
    expect(text({ toxic: 'toxic' }, 2)).toBe('2 ingredients, that are toxic');
    expect(text({ toxic: 'not_toxic' }, 2)).toBe('2 ingredients, that are not toxic');
    expect(text({ toxic: 'any' }, 2)).toBe('2 ingredients');
    expect(text({}, 2)).toBe('2 ingredients');
  });

  it('names deities, zodiac and elements', () => {
    const labels = {
      deities: { 'hecate-greek': 'Hecate (Greek)' },
      zodiac: { aries: 'Aries', leo: 'Leo' },
      elements: { fire: 'Fire', water: 'Water' },
    };
    expect(text({ deities: ['hecate-greek'] }, 1, { labels })).toBe(
      '1 ingredient, linked to Hecate (Greek)',
    );
    expect(text({ zodiac: ['aries', 'leo'] }, 1, { labels })).toBe(
      '1 ingredient, under Aries or Leo',
    );
    expect(text({ elements: ['fire', 'water'] }, 1, { labels })).toBe(
      '1 ingredient, of the Fire or Water element',
    );
  });

  it('shows a form with no label in title case', () => {
    expect(text({ forms: ['tincture'] }, 1)).toBe('1 ingredient, in the form Tincture');
  });

  it('puts every kind in the fixed order', () => {
    const labels = {
      categories: { protection: 'Protection', healing: 'Healing' },
      forms: { oil: 'Oil', resin: 'Resin' },
      deities: { isis: 'Isis' },
      zodiac: { aries: 'Aries' },
      planets: { sun: 'Sun', mars: 'Mars' },
      elements: { fire: 'Fire' },
    };
    const filter: SearchSentenceFilter = {
      // Given out of order on purpose.
      toxic: 'not_toxic',
      elements: ['fire'],
      planets: ['sun', 'mars'],
      zodiac: ['aries'],
      deities: ['isis'],
      forms: ['oil', 'resin'],
      categories: ['protection', 'healing'],
      query: 'rue',
      nomenclature: 'botanical',
      withoutReferences: true,
    };
    expect(text(filter, 3, { labels, admin: true })).toBe(
      '3 ingredients, matching “rue”, in the Protection and Healing categories, in the form Oil or Resin, linked to Isis, under Aries, ruled by the Sun or Mars, of the Fire element, that are not toxic, classified as botanical, without references',
    );
  });

  it("names a coven list's source, in stock and low stock after toxic, before the admin clauses", () => {
    expect(text({ source: 'local' }, 4)).toBe('4 ingredients, from the Local source');
    expect(text({ source: 'compendium' }, 1)).toBe('1 ingredient, from the Compendium source');
    expect(text({ inStock: true }, 2)).toBe('2 ingredients, in stock');
    expect(text({ lowStockOnly: true }, 2)).toBe('2 ingredients, low or out of stock');
    expect(
      text(
        {
          lowStockOnly: true,
          inStock: true,
          source: 'local',
          toxic: 'toxic',
          nomenclature: 'botanical',
        },
        3,
        { admin: true },
      ),
    ).toBe(
      '3 ingredients, that are toxic, from the Local source, in stock, low or out of stock, classified as botanical',
    );
  });

  it('counts the coven clauses as filters, ignores a false flag or a null source, and links each away', () => {
    expect(buildSearchSentence({ filter: { inStock: false, source: null }, total: 2 })).toEqual({
      fragments: [{ kind: 'text', text: '2 ingredients' }],
      hasFilter: false,
    });
    const { fragments, hasFilter } = buildSearchSentence({
      filter: { source: 'compendium', inStock: true, lowStockOnly: true },
      total: 2,
    });
    expect(hasFilter).toBe(true);
    expect(fragments.flatMap((f) => (f.kind === 'value' ? [[f.facet, f.value]] : []))).toEqual([
      ['source', 'compendium'],
      ['inStock', 'true'],
      ['lowStockOnly', 'true'],
    ]);
  });

  it('names Nomenclature and No Refs only for an admin list', () => {
    const filter: SearchSentenceFilter = { nomenclature: 'botanical', withoutReferences: true };
    expect(text(filter, 2)).toBe('2 ingredients');
    expect(buildSearchSentence({ filter, total: 2 }).hasFilter).toBe(false);
    expect(text(filter, 2, { admin: true })).toBe(
      '2 ingredients, classified as botanical, without references',
    );
    expect(buildSearchSentence({ filter, total: 2, admin: true }).hasFilter).toBe(true);
  });

  it('names No Form only for an admin list, and carries the facet that removes it', () => {
    const filter: SearchSentenceFilter = { withoutForms: true };
    expect(text(filter, 2)).toBe('2 ingredients');
    expect(text(filter, 2, { admin: true })).toBe('2 ingredients, without forms');
    const { fragments } = buildSearchSentence({ filter, total: 2, admin: true });
    expect(fragments).toContainEqual({
      kind: 'value',
      text: 'without forms',
      facet: 'withoutForms',
      value: 'true',
    });
  });

  it('carries on each value fragment the facet and value that remove it', () => {
    const labels = { forms: { oil: 'Oil' }, planets: { sun: 'Sun' } };
    const { fragments, hasFilter } = buildSearchSentence({
      filter: { forms: ['oil'], planets: ['sun'], query: 'rue', toxic: 'toxic' },
      total: 1,
      labels,
    });
    expect(hasFilter).toBe(true);
    expect(fragments.filter((f) => f.kind === 'value')).toEqual([
      { kind: 'value', text: '“rue”', facet: 'query', value: 'rue' },
      { kind: 'value', text: 'Oil', facet: 'forms', value: 'oil' },
      { kind: 'value', text: 'the Sun', facet: 'planets', value: 'sun' },
      { kind: 'value', text: 'toxic', facet: 'toxic', value: 'toxic' },
    ]);
  });
});
