import { describe, expect, it } from 'vitest';
import { listHref } from '@/lib/list-href';

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
