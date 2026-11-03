import {
  and,
  desc,
  eq,
  ilike,
  inArray,
  isNotNull,
  isNull,
  lt,
  max,
  not,
  notInArray,
  sql,
} from 'drizzle-orm';
import { documentMailingRecipients } from '../../modules/documents/schema/document-mailing-recipients';
import { documentMailings } from '../../modules/documents/schema/document-mailings';
import { documentVersions } from '../../modules/documents/schema/document-versions';
import { documents } from '../../modules/documents/schema/documents';
import { users } from '../../modules/identity/schema/users';
import { SYSTEM_ACTOR_ID } from '../../lib/system-actor';
import { SIGNED_OUT_SENDER_ID } from '../../lib/support-sender';
import { BOOTSTRAP_USER_ID } from '../bootstrap';
import { applyAudit } from '../audit';
import type { SiteAdmin } from '@/modules/identity';
import type { PageEntry, PageRequest } from '../../lib/types';
import { StaleWrite } from '../../lib/errors';
import { notSoftDeleted } from './predicates';
import { findPage } from './finders';
import { existsIn, selectFrom, selectOne } from './select';
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
    and(
      notSoftDeleted(documentVersions),
      publishedOf(documentId),
      eq(documentVersions.number, number),
    ),
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
      isNull(documentMailingRecipients.skippedAt),
    ),
  );
}

/** What a mailing reads of an account. */
export type MailingAccount = Pick<typeof users.$inferSelect, 'id' | 'email' | 'name'>;

// The seeded accounts that stand in for no one: they hold no mailbox.
const STAND_INS = [BOOTSTRAP_USER_ID, SYSTEM_ACTOR_ID, SIGNED_OUT_SENDER_ID];

// The accounts a mailing reaches: live, with a verified address a mailbox can hold (RFC 2606 reserves `.invalid`).
const mailable = and(
  notSoftDeleted(users),
  eq(users.emailVerified, true),
  not(ilike(users.email, '%.invalid')),
  notInArray(users.id, STAND_INS),
);

/** How many accounts a mailing would reach. */
export async function countDocumentMailingAccounts(): Promise<number> {
  const [row] = await selectFrom(users, mailable, {
    aggregate: { count: sql<number>`count(*)::int` },
    over: {},
  });
  return row.count;
}

/** One page of the accounts a mailing reaches, by id (CLAUDE.md rule 8). */
export function findDocumentMailingAccountPage(
  page: PageRequest,
): Promise<PageEntry<MailingAccount>[]> {
  return findPage(users, [users.id], page, mailable);
}

/** The named live accounts, for the mail's address and greeting. */
export function findDocumentMailingRecipientUsers(
  userIds: readonly string[],
): Promise<MailingAccount[]> {
  if (userIds.length === 0) return Promise.resolve([]);
  return selectFrom(users, and(notSoftDeleted(users), inArray(users.id, [...userIds])));
}

/** How many mails, of every mailing, went out since midnight UTC: the provider's daily allowance is shared by them all. */
export async function countDocumentMailsSentToday(): Promise<number> {
  const [row] = await selectFrom(
    documentMailingRecipients,
    and(
      notSoftDeleted(documentMailingRecipients),
      sql`${documentMailingRecipients.sentAt} >= date_trunc('day', now() at time zone 'utc')`,
    ),
    { aggregate: { count: sql<number>`count(*)::int` }, over: {} },
  );
  return row.count;
}

/** How many accounts of a mailing its mail has reached. */
export async function countDocumentMailingReached(mailingId: string): Promise<number> {
  const [row] = await selectFrom(
    documentMailingRecipients,
    and(
      notSoftDeleted(documentMailingRecipients),
      eq(documentMailingRecipients.mailingId, mailingId),
      isNotNull(documentMailingRecipients.sentAt),
    ),
    { aggregate: { count: sql<number>`count(*)::int` }, over: {} },
  );
  return row.count;
}

/** A live mailing by id, or `undefined`. */
export function findDocumentMailingById(
  mailingId: string,
): Promise<DocumentMailingRow | undefined> {
  return selectOne(
    documentMailings,
    and(notSoftDeleted(documentMailings), eq(documentMailings.id, mailingId)),
  );
}

/** The sending or paused mailing of a document's version numbered below `versionNumber`, which a newer mailing would replace. */
export function findOpenDocumentMailingBefore(
  documentId: string,
  versionNumber: number,
): Promise<DocumentMailingRow | undefined> {
  return selectOne(
    documentMailings,
    and(notSoftDeleted(documentMailings), openMailingBefore(documentId, versionNumber)),
  );
}

/** The longest-waiting sending mailing of any document, which the day's run carries on first, or `undefined`. */
export async function findOldestSendingDocumentMailing(): Promise<DocumentMailingRow | undefined> {
  const [oldest] = await findPage(
    documentMailings,
    [documentMailings.createdAt],
    { limit: 1, inverted: false },
    eq(documentMailings.status, 'sending'),
  );
  return oldest?.node;
}

function openMailingBefore(documentId: string, versionNumber: number) {
  return and(
    notSoftDeleted(documentMailings),
    inArray(documentMailings.status, ['sending', 'paused']),
    existsIn(
      documentVersions,
      and(
        eq(documentVersions.id, documentMailings.documentVersionId),
        eq(documentVersions.documentId, documentId),
        lt(documentVersions.number, versionNumber),
      ),
    ),
  );
}

/** The documents' named writes, beside their finders. `writerFor` spreads them into the writer. */
export function documentWrites({
  tx,
  session,
  update,
  softDelete,
  updateAtRevision,
}: WriterContext): Pick<
  AuditWriter,
  | 'updateDocument'
  | 'openDocumentDraft'
  | 'saveDocumentDraft'
  | 'publishDocumentDraft'
  | 'discardDocumentDraft'
  | 'startDocumentMailing'
  | 'addDocumentMailingRecipients'
  | 'markDocumentMailingRecipientsSent'
  | 'skipDocumentMailingRecipient'
  | 'lockDocumentMailingTurn'
  | 'replaceDocumentMailing'
  | 'finishDocumentMailing'
  | 'replaceOpenDocumentMailings'
  | 'pauseDocumentMailing'
  | 'resumeDocumentMailing'
> {
  // The save and the publish match drafts alone, so a published row is never written again and answers like a missing one.
  const draftById = (versionId: string) =>
    and(eq(documentVersions.id, versionId), eq(documentVersions.status, 'draft'));

  return {
    updateDocument: (_admin, documentId, values) =>
      update(documents, values, eq(documents.id, documentId)),
    // The document row is locked first, so two keepers opening at once take turns and the second finds the first's draft.
    openDocumentDraft: async (_admin, documentId, givenBody) => {
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
            { documentId, number: (highest ?? 0) + 1, body: givenBody ?? latest?.body ?? '' },
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
    // The revision check rides in the delete's own WHERE; only a refused delete reads the draft again, under a lock, to tell a stale revision from a draft that is gone.
    discardDocumentDraft: async (_admin, versionId, expectedRevision) => {
      const deleted: DocumentVersionRow[] = await softDelete(
        documentVersions,
        and(draftById(versionId), eq(documentVersions.revision, expectedRevision)),
      );
      if (deleted.length > 0) return deleted;
      const [current] = await selectFrom(
        documentVersions,
        and(notSoftDeleted(documentVersions), draftById(versionId)),
        { lockIn: tx, lockOrder: documentVersions.id },
      );
      if (current) throw new StaleWrite(current.revision);
      return [];
    },
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
    skipDocumentMailingRecipient: (mailingId, userId) =>
      update(
        documentMailingRecipients,
        { skippedAt: sql`now()` },
        and(
          eq(documentMailingRecipients.mailingId, mailingId),
          eq(documentMailingRecipients.userId, userId),
          isNull(documentMailingRecipients.sentAt),
          isNull(documentMailingRecipients.skippedAt),
        ),
      ),
    // An advisory lock, not a row lock, so a replace or pause of the mailing is never held up behind a send in progress.
    lockDocumentMailingTurn: async (mailingId) => {
      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtext(${'document-mailing:' + mailingId}))`,
      );
    },
    replaceDocumentMailing: (mailingId) =>
      update(
        documentMailings,
        { status: 'replaced' },
        and(eq(documentMailings.id, mailingId), eq(documentMailings.status, 'sending')),
      ),
    finishDocumentMailing: (mailingId) =>
      update(
        documentMailings,
        { status: 'sent', finishedAt: sql`now()` },
        and(eq(documentMailings.id, mailingId), eq(documentMailings.status, 'sending')),
      ),
    replaceOpenDocumentMailings: (_admin, documentId, versionNumber) =>
      update(
        documentMailings,
        { status: 'replaced' },
        openMailingBefore(documentId, versionNumber),
      ),
    pauseDocumentMailing: (mailingId) =>
      update(
        documentMailings,
        { status: 'paused' },
        and(eq(documentMailings.id, mailingId), eq(documentMailings.status, 'sending')),
      ),
    resumeDocumentMailing: (_admin, mailingId) =>
      update(
        documentMailings,
        { status: 'sending' },
        and(eq(documentMailings.id, mailingId), eq(documentMailings.status, 'paused')),
      ),
  };
}
