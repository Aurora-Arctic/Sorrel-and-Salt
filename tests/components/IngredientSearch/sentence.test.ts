import { describe, expect, it } from 'vitest';
import { buildSearchSentence } from '@/components/IngredientSearch/sentence';
import type { SearchSentenceFilter } from '@/components/IngredientSearch/types';

// The one named exception to the copy rule: this file asserts the
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
      '2 ingredients, in the form oil or resin',
    );
    expect(text({ forms: ['oil', 'resin', 'leaf'] }, 2, { labels })).toBe(
      '2 ingredients, in the form oil, resin or leaf',
    );
  });

  it('puts the before Sun and Moon only', () => {
    const labels = { celestialBodies: { sun: 'Sun', moon: 'Moon', mars: 'Mars', venus: 'Venus' } };
    expect(text({ celestialBodies: ['sun', 'mars'] }, 4, { labels })).toBe(
      '4 ingredients, ruled by the Sun or Mars',
    );
    expect(text({ celestialBodies: ['venus', 'moon'] }, 4, { labels })).toBe(
      '4 ingredients, ruled by Venus or the Moon',
    );
  });

  it('says and for all-mode categories and or for any-mode', () => {
    const labels = { categories: { protection: 'Protection', healing: 'Healing' } };
    const categories = ['protection', 'healing'];
    expect(text({ categories }, 2, { labels })).toBe(
      '2 ingredients, in the protection and healing categories',
    );
    expect(text({ categories, categoryMode: 'all' }, 2, { labels })).toBe(
      '2 ingredients, in the protection and healing categories',
    );
    expect(text({ categories, categoryMode: 'any' }, 2, { labels })).toBe(
      '2 ingredients, in the protection or healing category',
    );
    expect(text({ categories: ['protection'] }, 2, { labels })).toBe(
      '2 ingredients, in the protection category',
    );
  });

  it("says the grimoire's four facets after the categories, each as an or list (M13.22)", () => {
    const labels = {
      visibilities: { private: 'Private', workspace: 'Shared' },
      makers: { u1: 'Testwort', u2: 'Testmoor' },
    };
    expect(
      text(
        {
          moonPhases: ['Waxing', 'Full'],
          daysOfWeek: ['Friday'],
          visibility: 'workspace',
          makers: ['u1', 'u2'],
        },
        3,
        { labels },
      ),
    ).toBe(
      '3 ingredients, in the moon phase Waxing or Full, for the day Friday, that are shared, made by Testwort or Testmoor',
    );
  });

  it('writes the text query as matching', () => {
    expect(text({ query: 'rue' }, 1)).toBe('1 ingredient, matching rue');
    expect(text({ query: '  rue ' }, 1)).toBe('1 ingredient, matching rue');
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
      '1 ingredient, of the fire or water element',
    );
  });

  it('shows a form with no label in lower case', () => {
    expect(text({ forms: ['tincture'] }, 1)).toBe('1 ingredient, in the form tincture');
  });

  it('puts every kind in the fixed order', () => {
    const labels = {
      categories: { protection: 'Protection', healing: 'Healing' },
      forms: { oil: 'Oil', resin: 'Resin' },
      deities: { isis: 'Isis' },
      zodiac: { aries: 'Aries' },
      celestialBodies: { sun: 'Sun', mars: 'Mars' },
      elements: { fire: 'Fire' },
    };
    const filter: SearchSentenceFilter = {
      // Given out of order on purpose.
      toxic: 'not_toxic',
      elements: ['fire'],
      celestialBodies: ['sun', 'mars'],
      zodiac: ['aries'],
      deities: ['isis'],
      forms: ['oil', 'resin'],
      categories: ['protection', 'healing'],
      query: 'rue',
      nomenclature: 'botanical',
      withoutReferences: true,
    };
    expect(text(filter, 3, { labels, admin: true })).toBe(
      '3 ingredients, matching rue, in the protection and healing categories, in the form oil or resin, linked to Isis, under Aries, ruled by the Sun or Mars, of the fire element, that are not toxic, classified as botanical, without references',
    );
  });

  it("names a coven list's source, in stock and low stock after toxic, before the admin clauses", () => {
    expect(text({ source: 'local' }, 4)).toBe('4 ingredients, from the local source');
    expect(text({ source: 'compendium' }, 1)).toBe('1 ingredient, from the compendium source');
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
      '3 ingredients, that are toxic, from the local source, in stock, low or out of stock, classified as botanical',
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

  it('names the review mark only for an admin list, either way, and carries the facet that removes it (M14.8)', () => {
    expect(text({ reviewed: 'reviewed' }, 2)).toBe('2 ingredients');
    expect(text({ reviewed: 'reviewed' }, 2, { admin: true })).toBe(
      '2 ingredients, reviewed by a curator',
    );
    expect(text({ reviewed: 'needs_review' }, 2, { admin: true })).toBe(
      '2 ingredients, needing review',
    );
    const { fragments, hasFilter } = buildSearchSentence({
      filter: { reviewed: 'needs_review' },
      total: 2,
      admin: true,
    });
    expect(hasFilter).toBe(true);
    expect(fragments).toContainEqual({
      kind: 'value',
      text: 'needing review',
      facet: 'reviewed',
      value: 'needs_review',
    });
  });

  it('carries on each value fragment the facet and value that remove it', () => {
    const labels = { forms: { oil: 'Oil' }, celestialBodies: { sun: 'Sun' } };
    const { fragments, hasFilter } = buildSearchSentence({
      filter: { forms: ['oil'], celestialBodies: ['sun'], query: 'rue', toxic: 'toxic' },
      total: 1,
      labels,
    });
    expect(hasFilter).toBe(true);
    expect(fragments.filter((f) => f.kind === 'value')).toEqual([
      { kind: 'value', text: 'rue', facet: 'query', value: 'rue' },
      { kind: 'value', text: 'oil', facet: 'forms', value: 'oil' },
      { kind: 'value', text: 'the Sun', facet: 'celestialBodies', value: 'sun' },
      { kind: 'value', text: 'toxic', facet: 'toxic', value: 'toxic' },
    ]);
  });

  it('sets the joining words apart as join fragments, with their spaces as text and commas plain', () => {
    const labels = { forms: { oil: 'Oil', resin: 'Resin', leaf: 'Leaf' } };
    const { fragments } = buildSearchSentence({
      filter: { forms: ['oil', 'resin', 'leaf'] },
      total: 2,
      labels,
    });
    expect(fragments.filter((f) => f.kind === 'join')).toEqual([{ kind: 'join', text: 'or' }]);
    const at = fragments.findIndex((f) => f.kind === 'join');
    expect(fragments[at - 1]).toMatchObject({ kind: 'text' });
    expect((fragments[at - 1] as { text: string }).text.endsWith(' ')).toBe(true);
    expect(fragments[at + 1]).toEqual({ kind: 'text', text: ' ' });
    expect(fragments[at + 2]).toEqual({
      kind: 'value',
      text: 'leaf',
      facet: 'forms',
      value: 'leaf',
    });
    // The comma between the first two values stays text, never a join.
    expect(fragments.some((f) => f.kind === 'text' && f.text.includes(', '))).toBe(true);
    expect(fragments.filter((f) => f.kind === 'join')).toHaveLength(1);
  });

  it('makes the word and a join in all-mode categories', () => {
    const { fragments } = buildSearchSentence({
      filter: { categories: ['a', 'b'], categoryMode: 'all' },
      total: 2,
    });
    expect(fragments.filter((f) => f.kind === 'join')).toEqual([{ kind: 'join', text: 'and' }]);
  });

  it('draws no join for a single value or a lone clause', () => {
    const { fragments } = buildSearchSentence({
      filter: { forms: ['oil'], toxic: 'toxic' },
      total: 1,
    });
    expect(fragments.some((f) => f.kind === 'join')).toBe(false);
  });

  it('shows categories, forms, elements, source and nomenclature in lower case', () => {
    const labels = {
      categories: { warding: 'Warding' },
      forms: { oil: 'Oil' },
      elements: { fire: 'Fire' },
    };
    expect(
      text(
        {
          categories: ['warding'],
          forms: ['oil'],
          elements: ['fire'],
          source: 'compendium',
          nomenclature: 'Botanical',
        },
        1,
        { labels, admin: true },
      ),
    ).toBe(
      '1 ingredient, in the warding category, in the form oil, of the fire element, from the compendium source, classified as botanical',
    );
    expect(text({ source: 'local' }, 1)).toBe('1 ingredient, from the local source');
    const shown = buildSearchSentence({
      filter: { categories: ['warding'] },
      total: 1,
      labels,
    }).fragments.filter((f) => f.kind === 'value');
    // The value it removes keeps its own spelling; only the display is lowered.
    expect(shown).toEqual([
      { kind: 'value', text: 'warding', facet: 'categories', value: 'warding' },
    ]);
  });

  it('keeps the capitals of deities, zodiac signs and celestial bodies', () => {
    const labels = {
      deities: { hecate: 'Hecate' },
      zodiac: { scorpio: 'Scorpio' },
      celestialBodies: { sun: 'Sun', mars: 'Mars' },
    };
    expect(
      text({ deities: ['hecate'], zodiac: ['scorpio'], celestialBodies: ['sun', 'mars'] }, 1, {
        labels,
      }),
    ).toBe('1 ingredient, linked to Hecate, under Scorpio, ruled by the Sun or Mars');
  });

  it('shows the text query as typed', () => {
    expect(text({ query: 'Rue' }, 1)).toBe('1 ingredient, matching Rue');
  });
});

describe('the In My Covens clause (M12.55)', () => {
  const labels = { covens: { 'w-id': 'Testhollow', 'v-id': 'Testwren' } };

  it('says held in, naming the covens by their own capitals, joined by or', () => {
    expect(text({ covens: ['w-id'] }, 2, { labels })).toBe('2 ingredients, held in Testhollow');
    expect(text({ covens: ['w-id', 'v-id'] }, 3, { labels })).toBe(
      '3 ingredients, held in Testhollow or Testwren',
    );
  });

  it('comes straight after the text query, as the field leads the panel', () => {
    expect(
      text({ toxic: 'toxic', categories: ['rue'], covens: ['w-id'], query: 'ab' }, 1, { labels }),
    ).toBe('1 ingredient, matching ab, held in Testhollow, in the rue category, that are toxic');
  });

  it('names only a coven it has a label for: an id the viewer holds no coven by filters nothing', () => {
    const sentence = buildSearchSentence({ filter: { covens: ['x-id'] }, labels, total: 4 });
    expect(sentence.fragments.map((f) => f.text).join('')).toBe('4 ingredients');
    expect(sentence.hasFilter).toBe(false);
    expect(text({ covens: ['x-id', 'v-id'] }, 1, { labels })).toBe(
      '1 ingredient, held in Testwren',
    );
  });

  it('carries the facet and the id that remove it', () => {
    const { fragments, hasFilter } = buildSearchSentence({
      filter: { covens: ['v-id'] },
      labels,
      total: 1,
    });
    expect(hasFilter).toBe(true);
    expect(fragments).toContainEqual({
      kind: 'value',
      text: 'Testwren',
      facet: 'covens',
      value: 'v-id',
    });
  });

  describe('under Not In', () => {
    it('says not held in, naming the picked covens, joined by or', () => {
      expect(text({ covens: ['w-id'], covensNot: true }, 2, { labels })).toBe(
        '2 ingredients, not held in Testhollow',
      );
      expect(text({ covens: ['w-id', 'v-id'], covensNot: true }, 3, { labels })).toBe(
        '3 ingredients, not held in Testhollow or Testwren',
      );
    });

    it('says not held in any of my covens with no coven picked, the covens alone boxed', () => {
      const sentence = buildSearchSentence({ filter: { covensNot: true }, labels, total: 5 });
      expect(sentence.fragments.map((f) => f.text).join('')).toBe(
        '5 ingredients, not held in any of my covens',
      );
      // "not held in " is plain text, as it is with covens picked: the covens are the one value.
      const values = sentence.fragments.filter((f) => f.kind === 'value');
      expect(values).toEqual([
        { kind: 'value', text: 'any of my covens', facet: 'covensNot', value: 'true' },
      ]);
      expect(sentence.hasFilter).toBe(true);
    });

    it('says nothing when the address names covens and none has a label, as the read applies nothing', () => {
      const sentence = buildSearchSentence({
        filter: { covens: ['x-id'], covensNot: true },
        labels,
        total: 4,
      });
      expect(sentence.fragments.map((f) => f.text).join('')).toBe('4 ingredients');
      expect(sentence.hasFilter).toBe(false);
    });

    it('says nothing for a viewer with no covens to name, as the read ignores it', () => {
      expect(text({ covensNot: true }, 4)).toBe('4 ingredients');
      expect(text({ covensNot: true }, 4, { labels: { covens: {} } })).toBe('4 ingredients');
    });
  });
});
