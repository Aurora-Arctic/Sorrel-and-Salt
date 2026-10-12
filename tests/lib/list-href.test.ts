import { describe, expect, it } from 'vitest';
import { dialogParams, listHref } from '@/lib/list-href';

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

// The modal's half of a list's address: the three href.ts files encoded it
// alike before MB.115, and the pages read `new` by presence.
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
