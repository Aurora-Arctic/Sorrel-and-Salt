import { describe, expect, it } from 'vitest';
import {
  SUPPORT_ABOUTS,
  errorCodeOf,
  supportAboutOf,
  supportClosedHref,
  supportHref,
} from '@/lib/support-path';
import { supportRequestAbout } from '@/modules/support/schema/support-requests';

describe('supportAboutOf', () => {
  it('reads each about', () => {
    for (const { value } of SUPPORT_ABOUTS) expect(supportAboutOf(value)).toBe(value);
  });

  it('falls back to accessibility for a bare or unknown value', () => {
    expect(supportAboutOf('')).toBe('accessibility');
    expect(supportAboutOf(null)).toBe('accessibility');
    expect(supportAboutOf('billing')).toBe('accessibility');
  });
});

describe('errorCodeOf', () => {
  it('reads a three-digit status', () => {
    expect(errorCodeOf('404')).toBe(404);
    expect(errorCodeOf('500')).toBe(500);
  });

  it('refuses anything that is not a status', () => {
    for (const value of [null, '', '4', '40404', '99', '600', '4o4', '-404', '404 ']) {
      expect(errorCodeOf(value)).toBeUndefined();
    }
  });
});

describe('supportHref and supportClosedHref', () => {
  it('opens the dialog over the page and keeps its other parameters', () => {
    expect(supportHref('/coven/x', new URLSearchParams('page=2'), 'bug', 404)).toBe(
      '/coven/x?page=2&support=bug&error=404',
    );
  });

  it('carries no error when none is given, and drops a stale one', () => {
    expect(supportHref('/a', new URLSearchParams('error=500'), 'question')).toBe(
      '/a?support=question',
    );
  });

  it('closes by dropping its own parameters only', () => {
    expect(supportClosedHref('/a', new URLSearchParams('page=2&support=bug&error=404'))).toBe(
      '/a?page=2',
    );
    expect(supportClosedHref('/a', new URLSearchParams('support=bug'))).toBe('/a');
  });
});

describe('SUPPORT_ABOUTS', () => {
  it('offers exactly the values the database enum holds, in its order', () => {
    expect(SUPPORT_ABOUTS.map((about) => about.value)).toEqual(supportRequestAbout.enumValues);
  });
});
