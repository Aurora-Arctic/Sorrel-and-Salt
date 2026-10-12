import { describe, expect, it } from 'vitest';
import { NEW_COVEN_PATH, covenSlugOf, isReservedCovenSlug, pathInCoven } from '@/lib/coven-path';

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
