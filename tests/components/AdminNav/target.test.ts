import { describe, expect, it } from 'vitest';
import { adminTarget } from '@/components/AdminNav/target';
import { ADMIN_SECTIONS } from '@/components/AdminNav/sections';

const linked = ADMIN_SECTIONS.flatMap(({ pages }) => pages.map(({ tabs: [first] }) => first.href));

// The wait under the admin menu is drawn as the page that arrives: its
// heading, its Add or other action, its filter row, then the list.
describe('adminTarget', () => {
  it('waits in the admin region for every page', () => {
    for (const href of ['/admin', ...linked]) expect(adminTarget(href).region).toBe('admin');
  });

  it('draws the index as a page, which carries its own heading', () => {
    expect(adminTarget('/admin')).toMatchObject({ shape: 'page' });
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

  it.each(['/admin/categories', '/admin/forms', '/admin/deities', '/admin/celestial-bodies'])(
    'draws %s as a table under a heading with Add, and a filter',
    (href) => {
      expect(adminTarget(href)).toMatchObject({
        shape: 'table',
        title: true,
        action: true,
        filter: true,
      });
    },
  );

  it('draws users as a table under a heading with its control, and a filter', () => {
    expect(adminTarget('/admin/users')).toMatchObject({
      shape: 'table',
      title: true,
      action: true,
      filter: true,
    });
  });

  it('draws the tab row for each tabbed page, and not for the compendium or the index', () => {
    for (const href of [
      '/admin/categories',
      '/admin/forms',
      '/admin/deities',
      '/admin/celestial-bodies',
      '/admin/users',
    ]) {
      expect(adminTarget(href).tabs).toBe(true);
    }
    expect(adminTarget('/admin/compendium').tabs).toBeFalsy();
    expect(adminTarget('/admin').tabs).toBeFalsy();
  });

  it('gives every page the nav links a heading', () => {
    for (const href of linked) expect(adminTarget(href).title).toBe(true);
  });
});
