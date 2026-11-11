import { describe, expect, it } from 'vitest';
import { errorDetailFrom, newErrorReference } from '@/lib/error-report';
import { ERROR_DETAIL_MAX_LENGTH, errorReferenceOf } from '@/lib/support-path';

describe('errorDetailFrom', () => {
  it('gives an error’s name and message', () => {
    expect(errorDetailFrom(new TypeError('Testwort is not a function'))).toBe(
      'TypeError: Testwort is not a function',
    );
  });

  it('gives the name alone when the message is empty', () => {
    expect(errorDetailFrom(new RangeError(''))).toBe('RangeError');
  });

  it('gives a thrown value that is not an error as text', () => {
    expect(errorDetailFrom('Testwort failed')).toBe('Testwort failed');
    expect(errorDetailFrom(undefined)).toBe('undefined');
  });

  it('cuts a long message to the limit the server takes', () => {
    const detail = errorDetailFrom(new Error('x'.repeat(ERROR_DETAIL_MAX_LENGTH * 2)));
    expect(detail).toHaveLength(ERROR_DETAIL_MAX_LENGTH);
  });
});

describe('newErrorReference', () => {
  it('makes a reference the support form accepts, different each time', () => {
    const made = new Set(Array.from({ length: 20 }, () => newErrorReference()));
    expect(made.size).toBe(20);
    for (const reference of made) expect(errorReferenceOf(reference)).toBe(reference);
  });
});
