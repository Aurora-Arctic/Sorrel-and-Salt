import 'server-only';
import { findCurrentDocumentVersion, findDocumentByKey } from '@/db/repository';
import { AGREEMENT_DOCUMENTS } from '@/lib/agreement-version';
import { cachedDocumentRead } from '@/lib/documents-cache';
import type { AgreementVersion } from '@/lib/types';

// The versions in force are the highest published version of each document an account agrees to: the terms, and the disclaimer
// and code of ethics they include. A draft past one changes nothing. It lives here, not in a module, because the identity module
// records agreement to it and the documents module already reaches identity.

async function publishedNumberOf(key: string): Promise<number> {
  const document = await findDocumentByKey(key);
  const version = document && (await findCurrentDocumentVersion(document.id));
  // A document with nothing published asks for no agreement: the number that every account's stored one is at least.
  return version?.publishedAt ? version.number : 0;
}

async function readCurrentAgreementVersion(): Promise<AgreementVersion> {
  const numbers = await Promise.all(AGREEMENT_DOCUMENTS.map(({ key }) => publishedNumberOf(key)));
  const [terms = 0, disclaimer = 0, ethics = 0] = numbers;
  return { terms, disclaimer, ethics };
}

/** The version numbers in force, each 0 while its document has none published. Takes no session, and is cached under the documents tag. */
export const currentAgreementVersion = cachedDocumentRead(
  'agreement-current-version',
  readCurrentAgreementVersion,
);
