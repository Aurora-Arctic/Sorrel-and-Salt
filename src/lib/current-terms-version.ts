import 'server-only';
import { findCurrentDocumentVersion, findDocumentByKey } from '@/db/repository';
import { cachedDocumentRead } from '@/lib/documents-cache';

// The terms in force are the highest published version of the terms document, and a draft past it changes nothing. It lives
// here, not in a module, because the identity module records agreement to it and the documents module already reaches identity.
async function readCurrentTermsVersion(): Promise<number> {
  const document = await findDocumentByKey('terms');
  const version = document && (await findCurrentDocumentVersion(document.id));
  // A site with no published terms asks for no agreement: the number that every account's stored one is at least.
  return version?.publishedAt ? version.number : 0;
}

/** The number of the terms version in force, or 0 when none is published. Takes no session, and is cached under the documents tag. */
export const currentTermsVersion = cachedDocumentRead(
  'terms-current-version',
  readCurrentTermsVersion,
);
