import { describe, expect, it } from 'vitest';
import {
  choiceParam,
  defineSearchParams,
  flagParam,
  type SearchFilter,
  listParam,
  searchParam,
  slugListParam,
  textListParam,
  textParam,
} from '@/lib/search-param-table';

const KINDS = ['earth', 'fire'] as const;

const base = {
  query: textParam('query', 'query'),
  kind: choiceParam('kind', ['a', 'b'] as const, 'kind'),
  only: searchParam({
    name: 'only',
    variable: 'only',
    read: (raw) => raw !== undefined,
    write: (on: boolean) => on,
    toVariable: (on) => on || undefined,
  }),
  form: searchParam({
    name: 'form',
    variable: 'forms',
    read: (raw) => (Array.isArray(raw) ? (raw[0] ?? '') : (raw ?? '')).trim(),
    write: (value: string) => value,
    toVariable: (value) => (value ? [value] : undefined),
  }),
  elements: listParam('elements', KINDS, 'elements'),
};

const search = defineSearchParams(base);
type Filter = SearchFilter<typeof base>;

describe('the parameter table', () => {
  it('reads each entry from the address, a hand-edited value as no filter', () => {
    expect(
      search.read({
        query: '  wort ',
        kind: 'nope',
        only: '1',
        form: [' Oil ', 'Resin'],
        elements: ['fire', 'bogus', 'earth'],
      }),
    ).toEqual({ query: 'wort', kind: '', only: true, form: 'Oil', elements: ['fire', 'earth'] });
    expect(search.read({})).toEqual({
      query: '',
      kind: '',
      only: false,
      form: '',
      elements: [],
    });
  });

  it('writes a list as a repeated parameter and a blank as none, in the table order', () => {
    expect(
      search.href('/x', { query: 'wort', only: true, elements: ['fire', 'earth'], kind: 'a' }),
    ).toBe('/x?query=wort&kind=a&only&elements=fire&elements=earth');
    expect(search.href('/x', { query: '', elements: [] })).toBe('/x');
  });

  it('reads back what it wrote', () => {
    const filter: Filter = {
      query: 'a b',
      kind: 'b',
      only: true,
      form: 'Oil',
      elements: ['earth', 'fire'],
    };
    const written = new URL(search.href('/x', filter), 'http://x');
    const raw: Record<string, string | string[]> = {};
    for (const name of new Set(written.searchParams.keys())) {
      const all = written.searchParams.getAll(name);
      raw[name] = all.length > 1 ? all : all[0];
    }
    expect(search.read(raw)).toEqual(filter);
  });

  it('turns a filter into the query variables, a blank as none', () => {
    expect(
      search.variables({ query: 'wort', kind: '', only: false, form: 'Oil', elements: ['fire'] }),
    ).toEqual({
      query: 'wort',
      kind: undefined,
      only: undefined,
      forms: ['Oil'],
      elements: ['fire'],
    });
    expect(search.variables(search.read({})).elements).toBeUndefined();
  });

  it('opens the first page on any filter change, a cursor belonging to the filter it was read under', () => {
    const place: Partial<Filter> & { after: string; before: string } = {
      query: 'wort',
      elements: ['fire'],
      after: 'c1',
      before: 'c0',
    };
    const changed = search.changed(place, { elements: ['earth'] });
    expect(changed).toEqual({ query: 'wort', elements: ['earth'] });
    expect(search.href('/x', changed)).not.toMatch(/after|before/);
    expect(search.href('/x', place, { after: 'c1' })).toContain('after=c1');
  });

  it('takes one more entry without a change to read, href, variables or changed', () => {
    const wider = defineSearchParams({
      ...base,
      source: choiceParam('source', ['local', 'compendium'] as const, 'source'),
    });

    const filter = wider.read({ source: 'local', elements: 'fire' });
    expect(filter).toMatchObject({ source: 'local', elements: ['fire'] });
    expect(wider.href('/x', filter)).toBe('/x?elements=fire&source=local');
    expect(wider.variables(filter)).toMatchObject({ source: 'local', elements: ['fire'] });
    expect(wider.changed({ ...filter, after: 'c' }, { source: '' })).toEqual({
      ...filter,
      source: '',
    });
  });
});

describe('a slug list entry', () => {
  const slugs = defineSearchParams({
    query: textParam('query', 'query'),
    categories: slugListParam('categories', 'categoryIds', 'categories'),
  });
  const LOOKUP = {
    categories: new Map([
      ['protection', 'id-1'],
      ['cleansing', 'id-2'],
    ]),
  };

  it('reads the slugs repeated, trimmed, blanks and repeats dropped, in order', () => {
    expect(slugs.read({ categories: [' protection ', '', 'cleansing', 'protection'] })).toEqual({
      query: '',
      categories: ['protection', 'cleansing'],
    });
    expect(slugs.read({ categories: 'cleansing' }).categories).toEqual(['cleansing']);
    expect(slugs.read({}).categories).toEqual([]);
  });

  it('writes the slugs back as repeated parameters', () => {
    expect(slugs.href('/x', { categories: ['protection', 'cleansing'] })).toBe(
      '/x?categories=protection&categories=cleansing',
    );
    expect(slugs.href('/x', { categories: [] })).toBe('/x');
  });

  it('maps known slugs to ids through the lookup, drops an unknown one and keeps the rest', () => {
    expect(
      slugs.variables({ query: '', categories: ['protection', 'gone', 'cleansing'] }, LOOKUP),
    ).toMatchObject({ categoryIds: ['id-1', 'id-2'] });
  });

  it('gives no variable when no slug is known, or the lookup is missing', () => {
    expect(
      slugs.variables({ query: '', categories: ['gone'] }, LOOKUP).categoryIds,
    ).toBeUndefined();
    expect(slugs.variables({ query: '', categories: ['protection'] }).categoryIds).toBeUndefined();
    expect(slugs.variables({ query: '', categories: [] }, LOOKUP).categoryIds).toBeUndefined();
  });

  it('leaves the entries that read no lookup as they were', () => {
    expect(slugs.variables({ query: 'wort', categories: [] }, LOOKUP).query).toBe('wort');
    expect(search.variables(search.read({ query: 'wort' }))).toMatchObject({ query: 'wort' });
  });
});

// Free text in a list, for a vocabulary that is only an autofill: a form, a sign or a planet
// nobody has curated is still a valid value.
describe('a text list entry', () => {
  const texts = defineSearchParams({
    query: textParam('query', 'query'),
    forms: textListParam('forms', 'forms'),
  });

  it('reads the values repeated, trimmed, blanks and case-folded repeats dropped, in order', () => {
    expect(texts.read({ forms: [' Oil ', '', 'Tincture', 'oil'] }).forms).toEqual([
      'Oil',
      'Tincture',
    ]);
    expect(texts.read({ forms: 'Oil' }).forms).toEqual(['Oil']);
    expect(texts.read({}).forms).toEqual([]);
  });

  it('keeps a value the vocabulary does not hold, and one with a comma', () => {
    expect(texts.read({ forms: ['Uncurated Powder', 'Resin, hard'] }).forms).toEqual([
      'Uncurated Powder',
      'Resin, hard',
    ]);
  });

  it('writes the values back as repeated parameters, never comma-joined', () => {
    expect(texts.href('/x', { forms: ['Oil', 'Resin, hard'] })).toBe(
      '/x?forms=Oil&forms=Resin%2C+hard',
    );
    expect(texts.href('/x', { forms: [] })).toBe('/x');
  });

  it('becomes the variable as the list itself, and none when empty', () => {
    expect(texts.variables({ query: '', forms: ['Oil', 'Resin'] }).forms).toEqual(['Oil', 'Resin']);
    expect(texts.variables({ query: '', forms: [] }).forms).toBeUndefined();
  });
});

describe('a flag entry', () => {
  it.each([
    ['1', true],
    [['1'], true],
    [undefined, false],
    ['0', false],
    ['true', false],
    ['', false],
  ] as const)('reads %j as %s', (raw, on) => {
    expect(flagParam('lapsed').read(raw)).toBe(on);
  });

  it('writes an on flag as 1 and leaves an off one out of the address', () => {
    const entry = flagParam('lapsed');
    expect(entry.write(true)).toBe('1');
    expect(entry.write(false)).toBeUndefined();
  });

  it('names its variable after the parameter unless told otherwise', () => {
    expect(flagParam('lapsed').variable).toBe('lapsed');
    expect(flagParam('hidden', 'listing').variable).toBe('listing');
  });

  it('asks for the filter only when on, so an off flag adds nothing to the query', () => {
    const entry = flagParam('lapsed');
    expect(entry.toVariable(true)).toBe(true);
    expect(entry.toVariable(false)).toBeUndefined();
  });

  it('turns the flag into the value its query takes, when that is not a boolean', () => {
    const entry = flagParam('hidden', 'listing', (on) => (on ? 'hidden' : undefined));
    expect(entry.toVariable(true)).toBe('hidden');
    expect(entry.toVariable(false)).toBeUndefined();
  });

  it('round-trips through the table, so an address it wrote reads back as the same filter', () => {
    const table = defineSearchParams({ lapsed: flagParam('lapsed') });
    expect(table.read({ lapsed: '1' })).toMatchObject({ lapsed: true });
    expect(table.read({})).toMatchObject({ lapsed: false });
  });
});
