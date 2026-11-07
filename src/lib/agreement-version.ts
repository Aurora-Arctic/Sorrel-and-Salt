import type {
  AgreedColumns,
  AgreedVersion,
  AgreementDocumentKey,
  AgreementPart,
  AgreementVersion,
} from './types';

// An account agrees to the terms, the disclaimer and the code of ethics at once, and the agreement reads as one joint version,
// `terms.disclaimer.ethics` (claude-docs/design-decisions/support.md, "Agreeing to the terms covers the disclaimer and the code of ethics"). Pure, so the gate, the
// agreement page and the keeper's screens share it.

export const AGREEMENT_DOCUMENTS: readonly { part: AgreementPart; key: AgreementDocumentKey }[] = [
  { part: 'terms', key: 'terms' },
  { part: 'disclaimer', key: 'disclaimer' },
  { part: 'ethics', key: 'code-of-ethics' },
];

export function agreedVersionOfColumns(row: AgreedColumns): AgreedVersion {
  return {
    terms: row.agreedTermsVersion,
    disclaimer: row.agreedDisclaimerVersion,
    ethics: row.agreedEthicsVersion,
  };
}

/** The joint version, `terms.disclaimer.ethics`, with 0 for a document that has no
 * published version. */
export function formatAgreementVersion(version: AgreedVersion): string {
  return AGREEMENT_DOCUMENTS.map(({ part }) => version[part] ?? 0).join('.');
}

/** A stored null counts as 0, so a document with nothing published is never named, and an account that never agreed has every other one named. */
export function documentsChangedSince(
  agreed: AgreedVersion,
  current: AgreementVersion,
): AgreementDocumentKey[] {
  return AGREEMENT_DOCUMENTS.filter(({ part }) => (agreed[part] ?? 0) !== current[part]).map(
    ({ key }) => key,
  );
}

export function agreementIsCurrent(agreed: AgreedVersion, current: AgreementVersion): boolean {
  return documentsChangedSince(agreed, current).length === 0;
}

/** Whether any of the documents is one an account agrees to, so a mailing that covers it asks each account to agree again. */
export const asksAgreement = (documents: readonly { key: string }[]): boolean =>
  documents.some((document) => AGREEMENT_DOCUMENTS.some(({ key }) => key === document.key));
