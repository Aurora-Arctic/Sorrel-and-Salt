import type { DocumentKey } from '@/modules/documents';

/** Documents with no public version pages, so a version number means nothing to a reader or to the keeper editing one. */
export const UNVERSIONED_DOCUMENT_KEYS: ReadonlySet<DocumentKey> = new Set<DocumentKey>(['about']);

/** Documents a keeper's mailing never covers: About is not an agreed document, so its edits carry no "agree" step. */
export const UNMAILED_DOCUMENT_KEYS: readonly DocumentKey[] = ['about'];
