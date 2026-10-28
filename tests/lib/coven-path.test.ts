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
  ])('takes %s to %s', (path, expected) => {
    expect(pathInCoven(path, 'b')).toBe(expected);
  });
});

describe('isReservedCovenSlug', () => {
  it('reserves the create page’s segment and the values of `?new` that open a dialog, and nothing else', () => {
    expect(isReservedCovenSlug('new')).toBe(true);
    // The values of `?new` that open a dialog rather than name a coven (M10.12).
    expect(isReservedCovenSlug('spell')).toBe(true);
    expect(isReservedCovenSlug('ingredient')).toBe(true);
    // A value naming a coven is a prefix and then the whole slug, so a slug may start
    // with either word and still read one way.
    expect(isReservedCovenSlug('spell-circle')).toBe(false);
    expect(isReservedCovenSlug('ingredient-compendium')).toBe(false);
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
    expect(pathInCoven(path, 'b', { canReadMembers: false })).toBe(expected);
  });
});

describe('pathInCoven for an owner-only page', () => {
  it.each([
    // A member reads the members and cannot invite: the invitations page is a 404 for them, so
    // they land on the members page beside it.
    ['/coven/a/invitations', { canReadMembers: true, canInvite: false }, '/coven/b/members'],
    ['/coven/a/invitations', { canReadMembers: true, canInvite: true }, '/coven/b/invitations'],
    ['/coven/a/members', { canReadMembers: true, canInvite: false }, '/coven/b/members'],
  ])('takes %s with %j to %s', (path, options, expected) => {
    expect(pathInCoven(path, 'b', options)).toBe(expected);
  });
});

describe('pathInCoven from a page the coven registered', () => {
  it.each([
    ['/coven/a/ingredients/some-id', ['b'], '/coven/b/ingredients/some-id'],
    ['/coven/a/ingredients/some-id', ['c'], '/coven/b/ingredients'],
  ])('takes %s, opening in %j, to %s', (path, opens, expected) => {
    expect(pathInCoven(path, 'b', { opens })).toBe(expected);
  });

  it('keeps everything beneath the section when the coven opens it', () => {
    expect(pathInCoven('/coven/a/ingredients/x/y', 'b', { opens: ['b'] })).toBe(
      '/coven/b/ingredients/x/y',
    );
  });

  it('ignores the registration outside a coven', () => {
    expect(pathInCoven('/account', 'b', { opens: ['b'] })).toBe('/coven/b');
  });
});

// While a coven page is on its way its region draws the page that arrives: the
// heading and filter of the cupboard, the heading and tabs of the people, the
// home's own contents menu.
describe('covenTarget', () => {
  it('draws an ingredient\x27s own page as a page with its jump menu, not the cards of the list above it', () => {
    expect(covenTarget('/coven/a/ingredients/some-id')).toEqual({
      region: 'coven',
      shape: 'page',
      frame: 'entry',
      head: 'eyebrow',
    });
  });

  it('draws a section it does not name as a plain page', () => {
    expect(covenTarget('/coven/a/settings')).toEqual({ region: 'coven', shape: 'page' });
  });

  it('draws both grimoire tabs as cards under the heading, the tab row and a filter, and a page beneath them as a page', () => {
    const list = { region: 'coven', shape: 'cards', title: true, filter: true, tabs: true };
    expect(covenTarget('/coven/a/grimoire')).toEqual(list);
    expect(covenTarget('/coven/a/grimoire/drafts')).toEqual(list);
    expect(covenTarget('/coven/a/grimoire/some-id')).toEqual({ region: 'coven', shape: 'page' });
  });

  it('draws the new-spell page as a form', () => {
    expect(covenTarget('/coven/a/grimoire/new')).toEqual({ region: 'coven', shape: 'form' });
  });
});
