import { describe, expect, it } from 'vitest';
import { dialogParams, listHref, withParam } from '@/lib/list-href';
import { list } from '@/lib/search-params';

// A bare flag is what pages read `?new` and `?awaiting` by, and a blank filter must leave no empty pair behind (rule 5).
describe('listHref', () => {
  it('writes true as a bare flag, in the order given', () => {
    expect(listHref('/keepers/users', { query: 'wort', awaiting: true, after: 'c' })).toBe(
      '/keepers/users?query=wort&awaiting&after=c',
    );
  });

  it('leaves out undefined, false and blank values', () => {
    expect(listHref('/keepers/users', { query: '', awaiting: false, role: undefined })).toBe(
      '/keepers/users',
    );
  });

  it('encodes a value', () => {
    expect(listHref('/curator/compendium', { after: 'x/y z', new: true })).toBe(
      '/curator/compendium?after=x%2Fy+z&new',
    );
  });
});

describe('dialogParams', () => {
  it('writes the add form as a bare flag and an edit by its slug', () => {
    expect(listHref('/curator/categories', dialogParams('new'))).toBe('/curator/categories?new');
    expect(listHref('/curator/categories', dialogParams({ edit: 'testwort' }))).toBe(
      '/curator/categories?edit=testwort',
    );
  });

  it('writes no modal as neither', () => {
    expect(listHref('/curator/categories', dialogParams())).toBe('/curator/categories');
  });
});

describe('listHref, with a list', () => {
  it('writes each value as its own pair, in place', () => {
    expect(listHref('/compendium', { query: 'wort', forms: ['Herb', 'Oil'], after: 'c' })).toBe(
      '/compendium?query=wort&forms=Herb&forms=Oil&after=c',
    );
  });

  it('leaves out an empty list and blank values', () => {
    expect(listHref('/compendium', { forms: [] })).toBe('/compendium');
    expect(listHref('/compendium', { forms: ['', 'Oil'] })).toBe('/compendium?forms=Oil');
  });

  it('is read back by list', () => {
    const href = new URL(listHref('/compendium', { forms: ['A b', 'Oil'] }), 'http://x');
    expect(list(href.searchParams.getAll('forms'))).toEqual(['A b', 'Oil']);
  });
});

describe('withParam', () => {
  it('starts the query on an address with none', () => {
    expect(withParam('/coven/testwort/grimoire', 'spell', 's1')).toBe(
      '/coven/testwort/grimoire?spell=s1',
    );
  });

  it('adds to a query already there, keeping it', () => {
    expect(withParam('/coven/testwort/grimoire?q=moon&drafts', 'edit', 's1')).toBe(
      '/coven/testwort/grimoire?q=moon&drafts&edit=s1',
    );
  });

  it('encodes the value', () => {
    expect(withParam('/coven/testwort/grimoire', 'deleted', 'Moon & Salt/Water')).toBe(
      '/coven/testwort/grimoire?deleted=Moon+%26+Salt%2FWater',
    );
  });
});
