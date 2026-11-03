import 'server-only';
import {
  findDocumentByKey,
  findDocumentDraft,
  findCurrentDocumentVersion,
  findOneById,
  withAudit,
} from '@/db/repository';
import { documents } from '../schema/documents';
import { expireDocuments } from '@/lib/documents-cache';
import { NotFound, StaleWrite } from '@/lib/errors';
import type { Session } from '@/lib/session';
import { parseInput } from '@/lib/validation';
import { assertSiteAdmin } from '@/modules/identity';
import type { DocumentDraft, DocumentForEditing, PublishedDocumentVersion } from '../types';
import { DocumentInput } from '../validation/documents';

// The keeper's editing of the site's documents. Every call is a keeper's alone: a curator curates the compendium and reaches none of it.

const expire = expireDocuments;

function toDraft(row: {
  id: string;
  number: number;
  body: string;
  revision: number;
}): DocumentDraft {
  return { id: row.id, number: row.number, body: row.body, revision: row.revision };
}

/**
 * The document with its published version and its open draft, for the editor to open on.
 *
 * @throws {Forbidden} the session is not a site keeper.
 * @throws {NotFound} no live document holds the key.
 */
export async function readDocumentForEditing(
  session: Session,
  key: string,
): Promise<DocumentForEditing> {
  const admin = assertSiteAdmin(session);
  const document = await findDocumentByKey(key);
  if (!document) throw new NotFound('Document not found');
  const [version, draft] = await Promise.all([
    findCurrentDocumentVersion(document.id),
    findDocumentDraft(admin, document.id),
  ]);
  return {
    id: document.id,
    key: document.key,
    title: document.title,
    lede: document.lede,
    published: version?.publishedAt
      ? { number: version.number, body: version.body, publishedAt: version.publishedAt }
      : null,
    draft: draft ? toDraft(draft) : null,
  };
}

/**
 * Writes `body` into the document's draft. With no `expectedRevision` it opens the draft, and refuses if one is open already;
 * with one it writes into the open draft only while the draft is still at that revision.
 *
 * @throws {Forbidden} the session is not a site keeper.
 * @throws {NotFound} the document is missing or deleted, or a revision was given and no draft is open.
 * @throws {StaleWrite} the draft has moved on, carrying the revision it is at now.
 */
export async function saveDocumentDraft(
  session: Session,
  documentId: string,
  input: { body: string; expectedRevision: number | null },
): Promise<DocumentDraft> {
  const admin = assertSiteAdmin(session);
  const { body, expectedRevision } = input;
  if (expectedRevision === null) {
    const [opened] = await withAudit(session, (write) =>
      write.openDocumentDraft(admin, documentId, body),
    );
    if (opened) return toDraft(opened);
    if (!(await findOneById(documents, documentId))) throw new NotFound('Document not found');
    const open = await findDocumentDraft(admin, documentId);
    if (!open) throw new NotFound('Document not found');
    throw new StaleWrite(open.revision);
  }
  const open = await findDocumentDraft(admin, documentId);
  if (!open) throw new NotFound('Draft not found');
  const [saved] = await withAudit(session, (write) =>
    write.saveDocumentDraft(admin, open.id, expectedRevision, body),
  );
  if (!saved) throw new NotFound('Draft not found');
  return toDraft(saved);
}

/**
 * Publishes the document's open draft as its newest public version, and empties the cached public reads so the page shows it at once.
 *
 * @throws {Forbidden} the session is not a site keeper.
 * @throws {NotFound} no draft is open.
 * @throws {StaleWrite} the draft has moved on since the editor read it.
 */
export async function publishDocumentDraft(
  session: Session,
  documentId: string,
  input: { expectedRevision: number | null },
): Promise<PublishedDocumentVersion> {
  const admin = assertSiteAdmin(session);
  const open = await findDocumentDraft(admin, documentId);
  if (!open) throw new NotFound('Draft not found');
  const [published] = await withAudit(session, (write) =>
    write.publishDocumentDraft(admin, open.id, input.expectedRevision),
  );
  if (!published?.publishedAt) throw new NotFound('Draft not found');
  expire();
  return { number: published.number, body: published.body, publishedAt: published.publishedAt };
}

/**
 * Throws the document's open draft away, as a soft delete, and leaves its published versions as they are. The next save opens a new draft.
 * Answers the discarded draft's id.
 *
 * @throws {Forbidden} the session is not a site keeper.
 * @throws {NotFound} no draft is open.
 * @throws {StaleWrite} the draft has moved on since the editor read it, carrying the revision it is at now.
 */
export async function discardDocumentDraft(
  session: Session,
  documentId: string,
  input: { expectedRevision: number },
): Promise<string> {
  const admin = assertSiteAdmin(session);
  const open = await findDocumentDraft(admin, documentId);
  if (!open) throw new NotFound('Draft not found');
  const [discarded] = await withAudit(session, (write) =>
    write.discardDocumentDraft(admin, open.id, input.expectedRevision),
  );
  if (!discarded) throw new NotFound('Draft not found');
  return discarded.id;
}

/**
 * Changes a document's title and lede, which make no new version, and empties the cached public reads.
 *
 * @throws {Forbidden} the session is not a site keeper.
 * @throws {ValidationError} the title or lede is blank.
 * @throws {NotFound} the document is missing or deleted.
 */
export async function updateDocument(
  session: Session,
  documentId: string,
  input: { title: string; lede: string },
): Promise<{ id: string; title: string; lede: string }> {
  const admin = assertSiteAdmin(session);
  const values = parseInput(DocumentInput, input);
  const [row] = await withAudit(session, (write) =>
    write.updateDocument(admin, documentId, values),
  );
  if (!row) throw new NotFound('Document not found');
  expire();
  return { id: row.id, title: row.title, lede: row.lede };
}
