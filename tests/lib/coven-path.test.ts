import { describe, expect, it } from 'vitest';
import { covenSlugOf, pathInCoven } from '@/lib/coven-path';

describe('covenSlugOf', () => {
  it.each([
    ['/coven/fixture-coven', 'fixture-coven'],
    ['/coven/fixture-coven/ingredients/some-id', 'fixture-coven'],
    ['/account', null],
    ['/coven', null],
    ['/compendium/coven/x', null],
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
  ])('takes %s to %s', (path, expected) => {
    expect(pathInCoven(path, 'b')).toBe(expected);
  });
});
