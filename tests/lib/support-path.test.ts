import { describe, expect, it } from 'vitest';
import { errorCodeOf, supportClosedHref, supportHref, supportKindOf } from '@/lib/support-path';

describe('supportKindOf', () => {
  it('reads each kind', () => {
    expect(supportKindOf('bug')).toBe('bug');
    expect(supportKindOf('question')).toBe('question');
    expect(supportKindOf('accessibility')).toBe('accessibility');
  });

  it('falls back to accessibility for a bare or unknown value', () => {
    expect(supportKindOf('')).toBe('accessibility');
    expect(supportKindOf(null)).toBe('accessibility');
    expect(supportKindOf('billing')).toBe('accessibility');
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
