import 'server-only';
import {
  findCurrentDocumentVersion,
  findDocumentByKey,
  findPublishedDocumentVersion,
  findPublishedDocumentVersionPage,
} from '@/db/repository';
import { NotFound } from '@/lib/errors';
import { cachedDocumentRead } from '@/lib/documents-cache';
import type { PageEntry, PageRequest } from '@/lib/types';
import type { DocumentVersionSummary, PublishedDocument } from '../types';

// These reads take no session: a signed-out reader sees what a member sees, and a draft or a deleted row is never answered.

async function currentDocument(key: string): Promise<PublishedDocument> {
  const document = await findDocumentByKey(key);
  const version = document && (await findCurrentDocumentVersion(document.id));
  if (!document || !version?.publishedAt) throw new NotFound('Document not found');
  return {
    key: document.key,
    title: document.title,
    lede: document.lede,
    number: version.number,
    body: version.body,
    publishedAt: version.publishedAt,
  };
}

/** The largest value of the `document_versions.number` integer column. */
const MAX_VERSION_NUMBER = 2_147_483_647;

async function numberedDocument(key: string, number: number): Promise<PublishedDocument> {
  // A number that is no positive whole number, or past what the integer column holds, names no version, so nothing is read for it.
  if (!Number.isSafeInteger(number) || number < 1 || number > MAX_VERSION_NUMBER)
    throw new NotFound('Version not found');
  const document = await findDocumentByKey(key);
  const version = document && (await findPublishedDocumentVersion(document.id, number));
  if (!document || !version?.publishedAt) throw new NotFound('Version not found');
  return {
    key: document.key,
    title: document.title,
    lede: document.lede,
    number: version.number,
    body: version.body,
    publishedAt: version.publishedAt,
  };
}

async function versionList(
  key: string,
  page: PageRequest,
): Promise<PageEntry<DocumentVersionSummary>[]> {
  const document = await findDocumentByKey(key);
  if (!document) return [];
  const entries = await findPublishedDocumentVersionPage(document.id, page);
  return entries.flatMap(({ node, cursor }) =>
    node.publishedAt
      ? [{ node: { number: node.number, publishedAt: node.publishedAt }, cursor }]
      : [],
  );
}

/** The version of a document the page shows: its highest published one. Throws `NotFound` for a missing or deleted document. */
export const readDocument = cachedDocumentRead('document-current', currentDocument);

/** Throws `NotFound` for a draft, a deleted row, a number the document never had, or no number. */
export const readDocumentVersion = cachedDocumentRead('document-version', numberedDocument);

/** One page of a document's published versions, newest first. Empty for a document that is missing or has none. */
export const listDocumentVersions = cachedDocumentRead('document-versions', versionList);
