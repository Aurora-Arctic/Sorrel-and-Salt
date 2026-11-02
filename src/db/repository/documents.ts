import { and, desc, eq, inArray, isNull, max, sql } from 'drizzle-orm';
import { documentMailingRecipients } from '../../modules/documents/schema/document-mailing-recipients';
import { documentMailings } from '../../modules/documents/schema/document-mailings';
import { documentVersions } from '../../modules/documents/schema/document-versions';
import { documents } from '../../modules/documents/schema/documents';
import { applyAudit } from '../audit';
import type { SiteAdmin } from '@/modules/identity';
import type { PageEntry, PageRequest } from '../../lib/types';
import { notSoftDeleted } from './predicates';
import { findPage } from './finders';
import { selectFrom, selectOne } from './select';
import type {
  AuditWriter,
  DocumentMailingRecipientRow,
  DocumentMailingRow,
  DocumentRow,
  DocumentVersionRow,
  SortPart,
  WriterContext,
} from './types';

const publishedOf = (documentId: string) =>
  and(
    notSoftDeleted(documentVersions),
    eq(documentVersions.documentId, documentId),
    eq(documentVersions.status, 'published'),
  );

// Newest number first: the number negated, so the one ascending key reads the versions in reverse.
const NEWEST_FIRST: readonly SortPart[] = [
  { expression: sql`-${documentVersions.number}`, type: 'integer' },
];

/** The live document under a key, or `undefined`. Takes no proof: the public pages read it. */
export function findDocumentByKey(key: string): Promise<DocumentRow | undefined> {
  return selectOne(documents, and(notSoftDeleted(documents), eq(documents.key, key)));
}

/** One page of a document's published versions, newest number first (CLAUDE.md rule 8). A draft is never in it. */
export function findPublishedDocumentVersionPage(
  documentId: string,
  page: PageRequest,
): Promise<PageEntry<DocumentVersionRow>[]> {
  return findPage(documentVersions, NEWEST_FIRST, page, publishedOf(documentId));
}

/** The highest-numbered live published version of a document, which an open draft does not displace, or `undefined`. */
export async function findCurrentDocumentVersion(
  documentId: string,
): Promise<DocumentVersionRow | undefined> {
  const [newest] = await findPage(
    documentVersions,
    NEWEST_FIRST,
    { limit: 1, inverted: false },
    publishedOf(documentId),
  );
  return newest?.node;
}

/** A document's published version by number, or `undefined` for a draft, a deleted row or a number it never had. */
export function findPublishedDocumentVersion(
  documentId: string,
  number: number,
): Promise<DocumentVersionRow | undefined> {
  return selectOne(
    documentVersions,
    and(publishedOf(documentId), eq(documentVersions.number, number)),
  );
}

/** A document's open draft, or `undefined`. Under the `SiteAdmin` proof: a draft is not public. */
export function findDocumentDraft(
  _admin: SiteAdmin,
  documentId: string,
): Promise<DocumentVersionRow | undefined> {
  return selectOne(
    documentVersions,
    and(
      notSoftDeleted(documentVersions),
      eq(documentVersions.documentId, documentId),
      eq(documentVersions.status, 'draft'),
    ),
  );
}

/** The live mailing of a version, or `undefined`. */
export function findDocumentMailingForVersion(
  documentVersionId: string,
): Promise<DocumentMailingRow | undefined> {
  return selectOne(
    documentMailings,
    and(
      notSoftDeleted(documentMailings),
      eq(documentMailings.documentVersionId, documentVersionId),
    ),
  );
}

/** One page of the accounts of a mailing that its mail has not yet reached (CLAUDE.md rule 8). */
export function findUnsentDocumentMailingRecipientPage(
  mailingId: string,
  page: PageRequest,
): Promise<PageEntry<DocumentMailingRecipientRow>[]> {
  return findPage(
    documentMailingRecipients,
    [documentMailingRecipients.userId],
    page,
    and(
      eq(documentMailingRecipients.mailingId, mailingId),
      isNull(documentMailingRecipients.sentAt),
    ),
  );
}

/** The documents' named writes, beside their finders. `writerFor` spreads them into the writer. */
export function documentWrites({
  tx,
  session,
  update,
  updateAtRevision,
}: WriterContext): Pick<
  AuditWriter,
  | 'updateDocument'
  | 'openDocumentDraft'
  | 'saveDocumentDraft'
  | 'publishDocumentDraft'
  | 'startDocumentMailing'
  | 'addDocumentMailingRecipients'
  | 'markDocumentMailingRecipientsSent'
  | 'finishDocumentMailing'
> {
  // The save and the publish match drafts alone, so a published row is never written again and answers like a missing one.
  const draftById = (versionId: string) =>
    and(eq(documentVersions.id, versionId), eq(documentVersions.status, 'draft'));

  return {
    updateDocument: (_admin, documentId, values) =>
      update(documents, values, eq(documents.id, documentId)),
    // The document row is locked first, so two admins opening at once take turns and the second finds the first's draft.
    openDocumentDraft: async (_admin, documentId) => {
      const [document] = await selectFrom(
        documents,
        and(notSoftDeleted(documents), eq(documents.id, documentId)),
        { lockIn: tx, lockOrder: documents.id },
      );
      if (!document) return [];
      const [open] = await selectFrom(
        documentVersions,
        and(
          notSoftDeleted(documentVersions),
          eq(documentVersions.documentId, documentId),
          eq(documentVersions.status, 'draft'),
        ),
        { lockIn: tx, lockOrder: documentVersions.id },
      );
      if (open) return [];
      // Every version counts, deleted ones too: a number a reader may have cited is never reused.
      const [{ highest }] = await tx
        .select({ highest: max(documentVersions.number) })
        .from(documentVersions)
        .where(eq(documentVersions.documentId, documentId));
      const [latest] = await tx
        .select({ body: documentVersions.body })
        .from(documentVersions)
        .where(publishedOf(documentId))
        .orderBy(desc(documentVersions.number))
        .limit(1);
      return tx
        .insert(documentVersions)
        .values(
          applyAudit(
            'insert',
            { documentId, number: (highest ?? 0) + 1, body: latest?.body ?? '' },
            session,
          ) as never,
        )
        .returning();
    },
    saveDocumentDraft: (_admin, versionId, expectedRevision, body) =>
      updateAtRevision(documentVersions, draftById(versionId), expectedRevision, { body }),
    publishDocumentDraft: (_admin, versionId, expectedRevision) =>
      updateAtRevision(documentVersions, draftById(versionId), expectedRevision, {
        status: 'published',
        publishedAt: sql`now()`,
      }),
    // The version's row is locked, so a publish or delete alongside cannot slip between the check and the insert; a mailing started
    // alongside meets the one-per-version index and writes nothing.
    startDocumentMailing: async (_admin, versionId, { summary, recipientCount }) => {
      const [version] = await selectFrom(
        documentVersions,
        and(
          notSoftDeleted(documentVersions),
          eq(documentVersions.id, versionId),
          eq(documentVersions.status, 'published'),
        ),
        { lockIn: tx, lockOrder: documentVersions.id },
      );
      if (!version) return [];
      return tx
        .insert(documentMailings)
        .values(
          applyAudit(
            'insert',
            { documentVersionId: versionId, summary, recipientCount },
            session,
          ) as never,
        )
        .onConflictDoNothing()
        .returning();
    },
    addDocumentMailingRecipients: (mailingId, userIds) => {
      if (userIds.length === 0) return Promise.resolve([]);
      return tx
        .insert(documentMailingRecipients)
        .values(
          [...new Set(userIds)].map(
            (userId) => applyAudit('insert', { mailingId, userId }, session) as never,
          ),
        )
        .onConflictDoNothing()
        .returning();
    },
    markDocumentMailingRecipientsSent: (mailingId, userIds) =>
      userIds.length === 0
        ? Promise.resolve([])
        : update(
            documentMailingRecipients,
            { sentAt: sql`now()` },
            and(
              eq(documentMailingRecipients.mailingId, mailingId),
              inArray(documentMailingRecipients.userId, [...userIds]),
              isNull(documentMailingRecipients.sentAt),
            ),
          ),
    finishDocumentMailing: (mailingId) =>
      update(
        documentMailings,
        { status: 'sent', finishedAt: sql`now()` },
        and(eq(documentMailings.id, mailingId), eq(documentMailings.status, 'sending')),
      ),
  };
}
