import type { AgreedVersion, AgreementDocumentKey, AgreementPart, AgreementVersion } from './types';

// An account agrees to the terms, the disclaimer and the code of ethics at once, and the agreement reads as one joint version,
// `terms.disclaimer.ethics` (claude-docs/design-decisions/m15.79-agreement-covers-three-documents.md). Pure, so the gate, the
// agreement page and the keeper's screens share it.

/** Each part of the joint version, in its order, with the key of the document it numbers. */
export const AGREEMENT_DOCUMENTS: readonly { part: AgreementPart; key: AgreementDocumentKey }[] = [
  { part: 'terms', key: 'terms' },
  { part: 'disclaimer', key: 'disclaimer' },
  { part: 'ethics', key: 'code-of-ethics' },
];

/** The joint version, `terms.disclaimer.ethics`, with 0 for a document that has no published version. */
export function formatAgreementVersion(version: AgreedVersion): string {
  return AGREEMENT_DOCUMENTS.map(({ part }) => version[part] ?? 0).join('.');
}

/**
 * The keys of the documents whose version in force is not the one the account agreed to, in the joint version's order. A stored
 * null counts as 0, so a document with nothing published is never named, and an account that never agreed has every other one named.
 */
export function documentsChangedSince(
  agreed: AgreedVersion,
  current: AgreementVersion,
): AgreementDocumentKey[] {
  return AGREEMENT_DOCUMENTS.filter(({ part }) => (agreed[part] ?? 0) !== current[part]).map(
    ({ key }) => key,
  );
}

/** Whether the account's stored agreement is to all three versions in force. */
export function agreementIsCurrent(agreed: AgreedVersion, current: AgreementVersion): boolean {
  return documentsChangedSince(agreed, current).length === 0;
}
