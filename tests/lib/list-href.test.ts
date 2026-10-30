import { describe, expect, it } from 'vitest';
import { dialogParams, listHref, withParam } from '@/lib/list-href';
import { list } from '@/lib/search-params';

// The one shared path every list's address goes through (rule 5): a bare flag
// is what the pages read `?new` and `?awaiting` by, and a blank filter must
// leave no empty pair behind for the page to read as a filter.
describe('listHref', () => {
  it('writes true as a bare flag, in the order given', () => {
    expect(listHref('/admin/users', { query: 'wort', awaiting: true, after: 'c' })).toBe(
      '/admin/users?query=wort&awaiting&after=c',
    );
  });

  it('leaves out undefined, false and blank values', () => {
    expect(listHref('/admin/users', { query: '', awaiting: false, role: undefined })).toBe(
      '/admin/users',
    );
  });

  it('encodes a value', () => {
    expect(listHref('/admin/compendium', { after: 'x/y z', new: true })).toBe(
      '/admin/compendium?after=x%2Fy+z&new',
    );
  });
});

// The modal's half of a list's address: the three href.ts files encode it alike, and the pages
// read `new` by presence.
describe('dialogParams', () => {
  it('writes the add form as a bare flag and an edit by its slug', () => {
    expect(listHref('/admin/categories', dialogParams('new'))).toBe('/admin/categories?new');
    expect(listHref('/admin/categories', dialogParams({ edit: 'testwort' }))).toBe(
      '/admin/categories?edit=testwort',
    );
  });

  it('writes no modal as neither', () => {
    expect(listHref('/admin/categories', dialogParams())).toBe('/admin/categories');
  });
});

// A list filter is a repeated parameter, `?forms=Herb&forms=Oil`, which `list`
// (src/lib/search-params.ts) reads back.
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

// One parameter added to an address that may already carry a query: a Quick Look, an edit dialog or a
// deleted notice opened over a filtered list keeps the filter.
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
