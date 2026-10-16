import { describe, expect, expectTypeOf, it } from 'vitest';
import { encodeCursor } from '@/lib/pagination';
import { list, oneOf, readableCursor, single, someOf } from '@/lib/search-params';

describe('single', () => {
  it('takes the first of a repeated parameter, the one given, or none', () => {
    expect(single(['a', 'b'])).toBe('a');
    expect(single('a')).toBe('a');
    expect(single(undefined)).toBeUndefined();
  });
});

describe('readableCursor', () => {
  it('keeps a cursor the codec reads, and drops one it does not or none', () => {
    const cursor = encodeCursor({ key: ['Testcraft'], id: '00000000-0000-0000-0000-000000000001' });

    expect(readableCursor(cursor)).toBe(cursor);
    expect(readableCursor('not-a-cursor')).toBeUndefined();
    expect(readableCursor('')).toBeUndefined();
    expect(readableCursor(undefined)).toBeUndefined();
  });
});

describe('oneOf', () => {
  const ROLES = ['admin', 'user'] as const;

  it('keeps a value of the set, narrowed to it', () => {
    const role = oneOf(ROLES, 'admin');

    expect(role).toBe('admin');
    expectTypeOf(role).toEqualTypeOf<'admin' | 'user' | undefined>();
  });

  it('reads a value outside the set, a blank one or none as no filter', () => {
    expect(oneOf(ROLES, 'owner')).toBeUndefined();
    expect(oneOf(ROLES, '')).toBeUndefined();
    expect(oneOf(ROLES, undefined)).toBeUndefined();
  });
});

describe('list', () => {
  it('takes every value of a repeated parameter, the one given as a list of one, or none', () => {
    expect(list(['Herb', 'Oil'])).toEqual(['Herb', 'Oil']);
    expect(list('Herb')).toEqual(['Herb']);
    expect(list(undefined)).toEqual([]);
  });

  it('trims each value and drops a blank one', () => {
    expect(list([' Herb ', '', '  ', 'Oil'])).toEqual(['Herb', 'Oil']);
    expect(list(' ')).toEqual([]);
  });
});

describe('someOf', () => {
  const SETTINGS = ['toxic', 'not_toxic'] as const;

  it('keeps the values of the set, in the order given, narrowed to it', () => {
    const kept = someOf(SETTINGS, ['not_toxic', 'toxic']);

    expect(kept).toEqual(['not_toxic', 'toxic']);
    expectTypeOf(kept).toEqualTypeOf<('toxic' | 'not_toxic')[]>();
  });

  it('drops a value outside the set rather than refusing the rest', () => {
    expect(someOf(SETTINGS, ['toxic', 'deadly', ''])).toEqual(['toxic']);
    expect(someOf(SETTINGS, ['deadly'])).toEqual([]);
    expect(someOf(SETTINGS, [])).toEqual([]);
  });
});
