import type { Metadata } from 'next';
import type { ReactElement } from 'react';
import { notFound } from 'next/navigation';
import DocumentPage from '@/components/DocumentPage';
import type { DocumentPlaceholders } from '@/components/DocumentPage/types';
import { NotFound } from '@/lib/errors';
import { siteUrl } from '@/lib/site';
import { listDocumentVersions, readDocument, readDocumentVersion } from '@/modules/documents';
import type { DocumentKey } from '@/modules/documents';

// The two page shapes every document shares: the current version with its earlier ones linked
// beneath, and one numbered version on its own. No session is read, so a signed-out visitor reads
// the same page a member does.

/** Versions listed beneath a document; a document with more shows its newest this many. */
const HISTORY_LENGTH = 50;

/** A missing document or version is a 404; any other failure is the page's to show. */
async function orNotFound<T>(read: () => Promise<T>): Promise<T> {
  try {
    return await read();
  } catch (error) {
    if (error instanceof NotFound) notFound();
    throw error;
  }
}

export async function currentDocumentPage(
  key: DocumentKey,
  placeholders?: DocumentPlaceholders,
): Promise<ReactElement> {
  const current = await orNotFound(() => readDocument(key));
  const versions = await listDocumentVersions(key, { limit: HISTORY_LENGTH + 1, inverted: false });
  return (
    <DocumentPage
      title={current.title}
      lede={current.lede}
      updatedOn={current.publishedAt}
      number={current.number}
      body={current.body}
      placeholders={placeholders}
      history={versions
        .filter(({ node }) => node.number !== current.number)
        .map(({ node }) => ({
          number: node.number,
          publishedAt: node.publishedAt,
          href: `/${key}/versions/${node.number}`,
        }))}
    />
  );
}

/** A version number is digits with no leading zero; anything else names no version, and nothing is read for it. */
const VERSION_NUMBER = /^[1-9]\d*$/;

/**
 * A version page's title names the document and version. While it is the current version the page is a
 * copy of the document page, so that is its canonical; once a newer one is published it names itself.
 * An address that names no version gets nothing here, and the page is the 404.
 */
export async function versionDocumentMetadata(
  key: DocumentKey,
  params: Promise<{ number: string }>,
): Promise<Metadata> {
  const { number: address } = await params;
  if (!VERSION_NUMBER.test(address)) return {};
  try {
    const [version, current] = await Promise.all([
      readDocumentVersion(key, Number(address)),
      readDocument(key),
    ]);
    const path = version.number === current.number ? `/${key}` : `/${key}/versions/${address}`;
    return {
      title: `${version.title}, Version ${version.number}`,
      alternates: { canonical: siteUrl(path) },
    };
  } catch (error) {
    if (error instanceof NotFound) return {};
    throw error;
  }
}

export async function versionDocumentPage(
  key: DocumentKey,
  params: Promise<{ number: string }>,
  placeholders?: DocumentPlaceholders,
): Promise<ReactElement> {
  const { number: address } = await params;
  if (!VERSION_NUMBER.test(address)) notFound();
  const version = await orNotFound(() => readDocumentVersion(key, Number(address)));
  return (
    <DocumentPage
      title={version.title}
      lede={version.lede}
      updatedOn={version.publishedAt}
      number={version.number}
      body={version.body}
      placeholders={placeholders}
    />
  );
}
