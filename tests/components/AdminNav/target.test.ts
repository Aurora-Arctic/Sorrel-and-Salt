import { describe, expect, it } from 'vitest';
import { adminTarget } from '@/components/AdminNav/target';

// The wait under the admin menu is drawn as the page that arrives: its
// heading, its Add or other action, its filter row, then the list.
describe('adminTarget', () => {
  it.each(['/curator', '/keepers'])(
    'draws the %s index as sections of links, which carries its own heading and has no cards',
    (index) => {
      expect(adminTarget(index)).toMatchObject({ shape: 'contents' });
      expect(adminTarget(index).title).toBeFalsy();
    },
  );

  it('draws the compendium as cards under a heading with Add, and a filter', () => {
    expect(adminTarget('/curator/compendium')).toMatchObject({
      shape: 'cards',
      title: true,
      action: true,
      filter: true,
    });
  });

  it('draws a curated list as a table under a heading with a tab row, Add and a filter', () => {
    expect(adminTarget('/curator/categories')).toMatchObject({
      shape: 'table',
      title: true,
      tabs: true,
      action: true,
      filter: true,
    });
  });

  it('draws any other keeper address, a later tab, as a titled table with no filter', () => {
    const target = adminTarget('/curator/category-groups');

    expect(target).toMatchObject({ region: 'admin', shape: 'table', title: true });
    expect(target.filter).toBeFalsy();
    expect(target.action).toBeFalsy();
  });
});

describe('adminTarget for Support', () => {
  it('draws the support list as a titled table with its view tabs beneath the heading, a filter and its columns', () => {
    expect(adminTarget('/keepers/support')).toMatchObject({
      region: 'admin',
      shape: 'table',
      title: true,
      tabs: true,
      tabsBelow: true,
      filter: true,
    });
    expect(adminTarget('/keepers/support').columns).toBeGreaterThan(3);
  });
});

describe('adminTarget for the documents', () => {
  it('draws a document editor under a heading with its tabs beneath it, and no filter or action', () => {
    const target = adminTarget('/keepers/documents/terms');

    expect(target).toMatchObject({
      region: 'admin',
      shape: 'document',
      title: true,
      tabs: true,
      tabsBelow: true,
    });
    expect(target.filter).toBeFalsy();
    expect(target.action).toBeFalsy();
  });
});

describe('adminTarget for the business cards', () => {
  it('draws the business-card page as a titled form with no tabs, filter or action', () => {
    const target = adminTarget('/keepers/business-cards');

    expect(target).toMatchObject({ region: 'admin', shape: 'form', title: true });
    expect(target.tabs).toBeFalsy();
    expect(target.filter).toBeFalsy();
    expect(target.action).toBeFalsy();
  });
});
