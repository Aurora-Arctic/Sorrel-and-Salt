import { describe, expect, it } from 'vitest';
import {
  agreedVersionOfColumns,
  agreementIsCurrent,
  documentsChangedSince,
  formatAgreementVersion,
} from '@/lib/agreement-version';

// The agreement reads as one joint version, `terms.disclaimer.ethics` (claude-docs/design-decisions/m15.79-agreement-covers-three-documents.md).

const IN_FORCE = { terms: 1, disclaimer: 4, ethics: 2 };

describe('formatAgreementVersion', () => {
  it('joins the three numbers in the order terms, disclaimer, ethics', () => {
    expect(formatAgreementVersion(IN_FORCE)).toBe('1.4.2');
  });

  it('shows 0 for a document with no published version', () => {
    expect(formatAgreementVersion({ terms: 3, disclaimer: 0, ethics: null })).toBe('3.0.0');
  });
});

describe('documentsChangedSince', () => {
  it('names nothing for an agreement to every version in force', () => {
    expect(documentsChangedSince(IN_FORCE, IN_FORCE)).toEqual([]);
  });

  it.each([
    ['terms', { ...IN_FORCE, terms: 0 }, ['terms']],
    ['disclaimer', { ...IN_FORCE, disclaimer: 3 }, ['disclaimer']],
    ['code-of-ethics', { ...IN_FORCE, ethics: 1 }, ['code-of-ethics']],
  ])('names the %s alone when only it moved', (_key, agreed, changed) => {
    expect(documentsChangedSince(agreed, IN_FORCE)).toEqual(changed);
  });

  it('names all three, by document key, for an account that never agreed', () => {
    expect(
      documentsChangedSince({ terms: null, disclaimer: null, ethics: undefined }, IN_FORCE),
    ).toEqual(['terms', 'disclaimer', 'code-of-ethics']);
  });

  // A document with nothing published has no page to read, and every account's stored number is at least 0.
  it('never names a document with no published version', () => {
    expect(
      documentsChangedSince(
        { terms: 1, disclaimer: null, ethics: null },
        { terms: 1, disclaimer: 0, ethics: 0 },
      ),
    ).toEqual([]);
  });
});

describe('agreementIsCurrent', () => {
  it('is true only when all three numbers are the ones in force', () => {
    expect(agreementIsCurrent(IN_FORCE, IN_FORCE)).toBe(true);
    expect(agreementIsCurrent({ ...IN_FORCE, disclaimer: 3 }, IN_FORCE)).toBe(false);
    expect(agreementIsCurrent({ ...IN_FORCE, ethics: 1 }, IN_FORCE)).toBe(false);
    expect(agreementIsCurrent({ ...IN_FORCE, terms: null }, IN_FORCE)).toBe(false);
  });

  it('asks nothing while no document is published', () => {
    expect(
      agreementIsCurrent(
        { terms: null, disclaimer: null, ethics: null },
        { terms: 0, disclaimer: 0, ethics: 0 },
      ),
    ).toBe(true);
  });
});

describe('agreedVersionOfColumns', () => {
  it('reads a user row’s three agreed numbers as its stored agreement', () => {
    const row = { agreedTermsVersion: 1, agreedDisclaimerVersion: 4, agreedEthicsVersion: null };

    expect(agreedVersionOfColumns(row)).toEqual({ terms: 1, disclaimer: 4, ethics: null });
    expect(formatAgreementVersion(agreedVersionOfColumns(row))).toBe('1.4.0');
  });
});
