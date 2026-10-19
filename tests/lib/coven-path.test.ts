import { describe, expect, it } from 'vitest';
import {
  NEW_COVEN_PATH,
  covenSlugOf,
  covenTarget,
  isReservedCovenSlug,
  pathInCoven,
} from '@/lib/coven-path';

describe('covenSlugOf', () => {
  it.each([
    ['/coven/fixture-coven', 'fixture-coven'],
    ['/coven/fixture-coven/ingredients/some-id', 'fixture-coven'],
    ['/account', null],
    ['/coven', null],
    ['/compendium/coven/x', null],
    // The create page's segment is no workspace's (M9.16).
    [NEW_COVEN_PATH, null],
  ])('reads %s as %s', (path, expected) => {
    expect(covenSlugOf(path)).toBe(expected);
  });
});

describe('pathInCoven', () => {
  it.each([
    ['/coven/a/ingredients', '/coven/b/ingredients'],
    ['/coven/a/ingredients/some-id', '/coven/b/ingredients'],
    ['/coven/a', '/coven/b'],
    ['/account', '/coven/b'],
    ['/compendium/coven/x/y', '/coven/b'],
    [NEW_COVEN_PATH, '/coven/b'],
  ])('takes %s to %s', (path, expected) => {
    expect(pathInCoven(path, 'b')).toBe(expected);
  });
});

describe('isReservedCovenSlug', () => {
  it('reserves the create page’s segment and nothing else', () => {
    expect(isReservedCovenSlug('new')).toBe(true);
    expect(isReservedCovenSlug('new-2')).toBe(false);
    expect(isReservedCovenSlug('fixture-coven')).toBe(false);
  });
});

describe('pathInCoven for a viewer', () => {
  it.each([
    ['/coven/a/members', '/coven/b'],
    ['/coven/a/invitations', '/coven/b'],
    ['/coven/a/ingredients', '/coven/b/ingredients'],
  ])('takes %s to %s when members are unreadable there', (path, expected) => {
    expect(pathInCoven(path, 'b', false)).toBe(expected);
  });
});

// While a coven page is on its way its region draws the page that arrives: the
// heading and filter of the cupboard, the heading and tabs of the people, the
// home's own contents menu.
describe('covenTarget', () => {
  it('draws Ingredients as cards under a heading and a filter', () => {
    expect(covenTarget('/coven/a/ingredients')).toEqual({
      region: 'coven',
      shape: 'cards',
      title: true,
      filter: true,
    });
  });

  it.each(['members', 'invitations'])(
    'draws %s as a table under a heading and the tab row',
    (section) => {
      const target = covenTarget(`/coven/a/${section}`);
      expect(target).toMatchObject({ region: 'coven', shape: 'table', title: true, tabs: true });
      expect(target.filter).toBeFalsy();
    },
  );

  it('draws the coven\x27s home as a page with its contents menu', () => {
    expect(covenTarget('/coven/a')).toEqual({ region: 'coven', shape: 'page', frame: 'with-nav' });
  });

  it('draws an ingredient\x27s own page as a page with its jump menu, not the cards of the list above it', () => {
    expect(covenTarget('/coven/a/ingredients/some-id')).toEqual({
      region: 'coven',
      shape: 'page',
      frame: 'entry',
    });
  });

  it('draws a section it does not name as a plain page', () => {
    expect(covenTarget('/coven/a/grimoire')).toEqual({ region: 'coven', shape: 'page' });
  });
});
