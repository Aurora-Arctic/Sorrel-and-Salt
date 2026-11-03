// The site documents an account agrees to. A mailing that covers any of them tells each account it will be asked to agree again.
export const AGREEMENT_DOCUMENT_KEYS: readonly string[] = ['terms', 'disclaimer', 'code-of-ethics'];

/** Whether any of the documents is one an account agrees to. */
export const asksAgreement = (documents: readonly { key: string }[]): boolean =>
  documents.some((document) => AGREEMENT_DOCUMENT_KEYS.includes(document.key));
