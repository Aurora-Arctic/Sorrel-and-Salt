import {
  and,
  desc,
  eq,
  gt,
  ilike,
  inArray,
  isNotNull,
  isNull,
  max,
  not,
  notInArray,
  sql,
} from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { UNMAILED_DOCUMENT_KEYS } from '../../lib/unversioned-documents';
import { documentMailingItems } from '../../modules/documents/schema/document-mailing-items';
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
  DocumentMailingItem,
  DocumentMailingRecipientRow,
  DocumentMailingRow,
  DocumentRow,
  DocumentVersionRow,
  PendingDocumentVersion,
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

// A newer published version of the same document, which makes the outer one no longer its document's newest.
const newerVersion = alias(documentVersions, 'newer_version');

// A live item of a live sent mailing covering the outer version: a replaced, sending or paused mailing leaves it to be mailed.
const mailedVersion = () =>
  existsIn(
    documentMailingItems,
    and(
      eq(documentMailingItems.documentVersionId, documentVersions.id),
      existsIn(
        documentMailings,
        and(
          eq(documentMailings.id, documentMailingItems.mailingId),
          eq(documentMailings.status, 'sent'),
        ),
      ),
    ),
  );

/**
 * Each live document's newest published version, when it is not the first and no sent mailing covers it: what the next mailing
 * tells every account about. By title.
 */
export function findPendingDocumentVersions(): Promise<PendingDocumentVersion[]> {
  return selectFrom(
    documentVersions,
    and(
      notSoftDeleted(documentVersions),
      eq(documentVersions.status, 'published'),
      gt(documentVersions.number, 1),
      notInArray(documents.key, [...UNMAILED_DOCUMENT_KEYS]),
      not(
        existsIn(
          newerVersion,
          and(
            eq(newerVersion.documentId, documentVersions.documentId),
            eq(newerVersion.status, 'published'),
            gt(newerVersion.number, documentVersions.number),
          ),
        ),
      ),
      not(mailedVersion()),
    ),
    {
      aggregate: {
        documentId: sql<string>`${documentVersions.documentId}`,
        versionId: sql<string>`${documentVersions.id}`,
        key: sql<string>`${documents.key}`,
        title: sql<string>`${documents.title}`,
        versionNumber: sql<number>`${documentVersions.number}`,
      },
      over: {},
      joins: [
        { type: 'inner', table: documents, on: eq(documents.id, documentVersions.documentId) },
      ],
      orderBy: [documents.title],
    },
  );
}

/** The live items of the mailings, each with its version's number and document; an item whose version or document is gone is left out. */
export function findDocumentMailingItems(
  mailingIds: readonly string[],
): Promise<DocumentMailingItem[]> {
  if (mailingIds.length === 0) return Promise.resolve([]);
  return selectFrom(
    documentMailingItems,
    and(
      notSoftDeleted(documentMailingItems),
      inArray(documentMailingItems.mailingId, [...mailingIds]),
    ),
    {
      aggregate: {
        mailingId: sql<string>`${documentMailingItems.mailingId}`,
        versionId: sql<string>`${documentMailingItems.documentVersionId}`,
        key: sql<string>`${documents.key}`,
        title: sql<string>`${documents.title}`,
        versionNumber: sql<number>`${documentVersions.number}`,
        summary: sql<string>`${documentMailingItems.summary}`,
      },
      over: {},
      joins: [
        {
          type: 'inner',
          table: documentVersions,
          on: eq(documentVersions.id, documentMailingItems.documentVersionId),
        },
        { type: 'inner', table: documents, on: eq(documents.id, documentVersions.documentId) },
      ],
      orderBy: [documents.title],
    },
  );
}

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

export async function countDocumentMailingAccounts(): Promise<number> {
  const [row] = await selectFrom(users, mailable, {
    aggregate: { count: sql<number>`count(*)::int` },
    over: {},
  });
  return row.count;
}

export function findDocumentMailingAccountPage(
  page: PageRequest,
): Promise<PageEntry<MailingAccount>[]> {
  return findPage(users, [users.id], page, mailable);
}

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

export function findDocumentMailingById(
  mailingId: string,
): Promise<DocumentMailingRow | undefined> {
  return selectOne(
    documentMailings,
    and(notSoftDeleted(documentMailings), eq(documentMailings.id, mailingId)),
  );
}

// A mailing still going: sending, or paused until a keeper resumes it.
const openMailingStatus = () => inArray(documentMailings.status, ['sending', 'paused']);

/** The live sending and paused mailings, oldest first: what a new mailing replaces. */
export async function findOpenDocumentMailings(): Promise<DocumentMailingRow[]> {
  const open = await selectFrom(
    documentMailings,
    and(notSoftDeleted(documentMailings), openMailingStatus()),
  );
  return open.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
}

/** The newest live mailing that has reached every account, or `undefined`. */
export async function findLatestSentDocumentMailing(): Promise<DocumentMailingRow | undefined> {
  const [latest] = await findPage(
    documentMailings,
    [documentMailings.createdAt],
    { limit: 1, inverted: true },
    eq(documentMailings.status, 'sent'),
  );
  return latest?.node;
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
  | 'lockDocumentMailingStart'
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
    // The versions' rows are locked, so a delete alongside cannot slip between the check and the inserts.
    startDocumentMailing: async (_admin, { items, recipientCount }) => {
      const versionIds = [...new Set(items.map((item) => item.versionId))];
      if (versionIds.length === 0) return [];
      const versions = await selectFrom(
        documentVersions,
        and(
          notSoftDeleted(documentVersions),
          inArray(documentVersions.id, versionIds),
          eq(documentVersions.status, 'published'),
        ),
        { lockIn: tx, lockOrder: documentVersions.id },
      );
      if (versions.length !== versionIds.length) return [];
      const started: DocumentMailingRow[] = await tx
        .insert(documentMailings)
        .values(applyAudit('insert', { recipientCount }, session) as never)
        .returning();
      await tx
        .insert(documentMailingItems)
        .values(
          items.map(
            ({ versionId, summary }) =>
              applyAudit(
                'insert',
                { mailingId: started[0]!.id, documentVersionId: versionId, summary },
                session,
              ) as never,
          ),
        );
      return started;
    },
    // An advisory lock rather than a row lock: no one row is read by every start.
    lockDocumentMailingStart: async () => {
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${'document-mailing:start'}))`);
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
    replaceOpenDocumentMailings: () =>
      update(
        documentMailings,
        { status: 'replaced' },
        and(notSoftDeleted(documentMailings), openMailingStatus()),
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
