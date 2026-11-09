import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import type { ReactElement } from 'react';
import DocumentPage from '@/components/DocumentPage';
import type { DocumentPageProps, DocumentPlaceholders } from '@/components/DocumentPage/types';
import { NotFound } from '@/lib/errors';
import { orNotFound } from '@/lib/or-not-found';
import { helpViewerOffers } from '@/lib/help-viewer';
import { UNVERSIONED_DOCUMENT_KEYS } from '@/lib/unversioned-documents';
import { publicPageMetadata } from '@/lib/page-metadata';
import { SITE_NAME } from '@/lib/site';
import { listDocumentVersions, readDocument, readDocumentVersion } from '@/modules/documents';
import type { DocumentKey } from '@/modules/documents';

// The two page shapes every document shares: the current version with its earlier ones linked
// beneath, and one numbered version on its own. The current page reads the viewer only to hand a
// keeper the editor address; the text is the same for every reader, and a version page reads no session.

const HISTORY_LENGTH = 50;

export async function currentDocumentPage(
  key: DocumentKey,
  placeholders?: DocumentPlaceholders,
  variant?: DocumentPageProps['variant'],
): Promise<ReactElement> {
  const current = await orNotFound(() => readDocument(key));
  // The same keeper-only read the help pages use for their pencil; the editor refuses anyone else on its own.
  const editHref = (await helpViewerOffers()).edit ? `/keepers/documents/${key}` : undefined;
  if (UNVERSIONED_DOCUMENT_KEYS.has(key)) {
    return (
      <DocumentPage
        title={current.title}
        body={current.body}
        placeholders={placeholders}
        editHref={editHref}
        variant={variant}
      />
    );
  }
  const versions = await listDocumentVersions(key, { limit: HISTORY_LENGTH + 1, inverted: false });
  return (
    <DocumentPage
      title={current.title}
      lede={current.lede}
      updatedOn={current.publishedAt}
      number={current.number}
      body={current.body}
      placeholders={placeholders}
      editHref={editHref}
      variant={variant}
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
    const title = `${version.title}, Version ${version.number}`;
    return publicPageMetadata(title, `${title}, as published on ${SITE_NAME}.`, path);
  } catch (error) {
    if (error instanceof NotFound) return {};
    throw error;
  }
}

export async function versionDocumentPage(
  key: DocumentKey,
  params: Promise<{ number: string }>,
  placeholders?: DocumentPlaceholders,
  variant?: DocumentPageProps['variant'],
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
      variant={variant}
    />
  );
}
