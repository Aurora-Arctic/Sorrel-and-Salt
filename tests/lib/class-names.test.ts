import { describe, expect, it } from 'vitest';
import { cx } from '@/lib/class-names';

describe('cx', () => {
  it('joins the class names given, in order, with one space between', () => {
    expect(cx('testwort', 'testwort--open', 'is-chosen')).toBe('testwort testwort--open is-chosen');
  });

  it('drops a part that is false, null, undefined or empty', () => {
    const open = false;
    expect(cx('testwort', open && 'testwort--open', null, undefined, '', 'is-chosen')).toBe(
      'testwort is-chosen',
    );
  });

  it('gives an empty string when no part is set, so a caller can fall back with `|| undefined`', () => {
    expect(cx()).toBe('');
    expect(cx(false, null, undefined, '')).toBe('');
  });
});
