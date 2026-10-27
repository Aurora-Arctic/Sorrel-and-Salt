import { describe, expect, it } from 'vitest';
import { adminTarget } from '@/components/AdminNav/target';

// The wait under the admin menu is drawn as the page that arrives: its
// heading, its Add or other action, its filter row, then the list.
describe('adminTarget', () => {
  it('draws the index as sections of links, which carries its own heading and has no cards', () => {
    expect(adminTarget('/admin')).toMatchObject({ shape: 'contents' });
    expect(adminTarget('/admin').title).toBeFalsy();
  });

  it('draws the compendium as cards under a heading with Add, and a filter', () => {
    expect(adminTarget('/admin/compendium')).toMatchObject({
      shape: 'cards',
      title: true,
      action: true,
      filter: true,
    });
  });

  it('draws a curated list as a table under a heading with a tab row, Add and a filter', () => {
    expect(adminTarget('/admin/categories')).toMatchObject({
      shape: 'table',
      title: true,
      tabs: true,
      action: true,
      filter: true,
    });
  });

  it('draws any other admin address, a later tab, as a titled table with no filter', () => {
    const target = adminTarget('/admin/category-groups');

    expect(target).toMatchObject({ region: 'admin', shape: 'table', title: true });
    expect(target.filter).toBeFalsy();
    expect(target.action).toBeFalsy();
  });
});
