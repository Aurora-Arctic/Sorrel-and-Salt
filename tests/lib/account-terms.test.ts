import { describe, expect, it } from 'vitest';
import { isTermsPage, termsPagePath } from '@/lib/account-terms';

describe('termsPagePath', () => {
  it('is the bare page with nowhere to return to', () => {
    expect(termsPagePath(undefined)).toBe('/account/terms');
  });

  it('carries the return path encoded', () => {
    expect(termsPagePath('/coven/hearth?tab=mine')).toBe(
      `/account/terms?next=${encodeURIComponent('/coven/hearth?tab=mine')}`,
    );
  });
});

describe('isTermsPage', () => {
  it('matches the page with or without a query', () => {
    expect(isTermsPage('/account/terms')).toBe(true);
    expect(isTermsPage('/account/terms?next=%2Fcoven')).toBe(true);
  });

  it('matches nothing else', () => {
    expect(isTermsPage(undefined)).toBe(false);
    expect(isTermsPage('/account/email')).toBe(false);
    expect(isTermsPage('/account/terms/extra')).toBe(false);
    expect(isTermsPage('/coven?next=/account/terms')).toBe(false);
  });
});
