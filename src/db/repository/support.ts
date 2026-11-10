import {
  and,
  eq,
  gt,
  gte,
  inArray,
  isNotNull,
  isNull,
  lte,
  ne,
  not,
  or,
  sql,
  type SQL,
} from 'drizzle-orm';
import { invitations } from '../../modules/coven/schema/invitations';
import { supportReplies } from '../../modules/support/schema/support-replies';
import { supportRequests } from '../../modules/support/schema/support-requests';
import { supportSendCounts } from '../../modules/support/schema/support-send-counts';
import { supportTimeouts } from '../../modules/support/schema/support-timeouts';
import { SUPPORT_VIEWS } from '../../lib/support-path';
import { SYSTEM_ACTOR_ID } from '../../lib/system-actor';
import { ANONYMISED_SUBJECT, SIGNED_OUT_SENDER_ID } from '../../lib/support-sender';
import type { SiteAdmin } from '@/modules/identity';
import type { SupportSenderGroup, SupportView } from '../../lib/support-path';
import { findPage, findPageCount } from './finders';
import { newestFirst, noEndOrAhead, notSoftDeleted } from './predicates';
import { existsIn, selectFrom, selectOne } from './select';
import type { Cursor, PageCount, PageEntry, PageRequest } from '../../lib/types';
import type {
  AuditWriter,
  SortPart,
  StandingTimeout,
  SupportReader,
  SupportMenuCounts,
  SupportStatusCounts,
  SupportViewCounts,
  SupportRequestFilter,
  SupportViewer,
  WriterContext,
} from './types';

// A request is the account's, not a coven's: its reader scope is SQL here (claude-docs/design-decisions/support.md, "The curator view").

export const RESOLVED_CLOSES_AFTER_DAYS = 7;

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * A resolved request whose seven days have passed reads as closed, whether or not its job has closed it yet, so a lost run only
 * delays the stored move. Every finder and move below reads status through this. `coalesce` keeps a resolved request with no
 * `resolved_at` resolved, as `asOfNow` reads it, rather than a null that drops it from every view.
 */
const lapsedResolved = sql`(${supportRequests.status} = 'resolved' and coalesce(${supportRequests.resolvedAt} <= now() - make_interval(days => ${RESOLVED_CLOSES_AFTER_DAYS}), false))`;

function asOfNow<Row extends typeof supportRequests.$inferSelect>(row: Row): Row {
  if (row.status !== 'resolved' || row.resolvedAt === null) return row;
  const closedAt = new Date(row.resolvedAt.getTime() + RESOLVED_CLOSES_AFTER_DAYS * DAY_MS);
  return closedAt.getTime() <= Date.now() ? { ...row, status: 'closed', closedAt } : row;
}

const oneAsOfNow = <Row extends typeof supportRequests.$inferSelect>(row: Row | undefined) =>
  row && asOfNow(row);

const readAsOfNow = <Entry extends { node: typeof supportRequests.$inferSelect }>(
  entries: Entry[],
): Entry[] => entries.map((entry) => ({ ...entry, node: asOfNow(entry.node) }));

function statusIs(status: (typeof supportRequests.$inferSelect)['status']): SQL {
  if (status === 'resolved')
    return and(eq(supportRequests.status, 'resolved'), not(lapsedResolved)) as SQL;
  if (status === 'closed') return or(eq(supportRequests.status, 'closed'), lapsedResolved) as SQL;
  return eq(supportRequests.status, status);
}

function readerScope(reader: SupportReader): SQL | undefined {
  if (reader.role === 'admin') return undefined;
  return or(
    eq(supportRequests.curatorVisible, true),
    eq(supportRequests.assignedTo, reader.proof.userId),
  );
}

function viewerScope(viewer: SupportViewer): SQL | undefined {
  const own = eq(supportRequests.createdBy, viewer.userId);
  if (viewer.role === 'admin') return undefined;
  if (viewer.role === 'curator') {
    return or(
      own,
      eq(supportRequests.curatorVisible, true),
      eq(supportRequests.assignedTo, viewer.userId),
    );
  }
  return own;
}

// Open ahead of resolved, then newest first. The status rank is an integer expression, and the instant is negated and taken as
// `numeric` to keep a `Date`'s dropped microseconds, as the other newest-first lists do.
const REQUEST_ORDER: readonly SortPart[] = [
  {
    expression: sql`case when ${supportRequests.status} = 'open' then 0 else 1 end`,
    type: 'integer',
  },
  newestFirst(supportRequests.createdAt),
];

// The sender's list: still open (open, waiting on the sender) ahead of done (resolved, closed), then newest first.
const OWN_ORDER: readonly SortPart[] = [
  {
    expression: sql`case when ${supportRequests.status} in ('open', 'waiting_on_sender') then 0 else 1 end`,
    type: 'integer',
  },
  newestFirst(supportRequests.createdAt),
];

// The queue views: the oldest sender activity first, which a request with none dates from its sending.
const QUEUE_ORDER: readonly SortPart[] = [
  {
    expression: sql`extract(epoch from coalesce(${supportRequests.lastSenderActivityAt}, ${supportRequests.createdAt}))`,
    type: 'numeric',
  },
];

const QUEUE_VIEWS: readonly SupportView[] = ['needs_staff', 'mine', 'unassigned'];

// Staff's every view: an anonymised request, which the System account holds and which takes no more work, after every other,
// the view's own order kept within each. A key of the cursor's, so a page that crosses from one to the other stays exact.
const ANONYMISED_LAST: SortPart = {
  expression: sql`case when ${supportRequests.createdBy} = ${SYSTEM_ACTOR_ID} then 1 else 0 end`,
  type: 'integer',
};

const orderOf = ({ view }: SupportRequestFilter): readonly SortPart[] => [
  ANONYMISED_LAST,
  ...(view && QUEUE_VIEWS.includes(view) ? QUEUE_ORDER : REQUEST_ORDER),
];

function viewArm(reader: SupportReader, view: SupportView): SQL {
  const open = eq(supportRequests.status, 'open');
  switch (view) {
    case 'needs_staff':
      return open;
    case 'mine':
      return and(open, eq(supportRequests.assignedTo, reader.proof.userId)) as SQL;
    case 'unassigned':
      return and(open, isNull(supportRequests.assignedTo)) as SQL;
    case 'waiting':
      return eq(supportRequests.status, 'waiting_on_sender');
    case 'resolved':
      return statusIs('resolved');
    case 'closed':
      return statusIs('closed');
  }
}

/** The sender is in the group. A beta tester accepted a printed card: derived from the
 * invitation, never stored. */
function senderArm(group: SupportSenderGroup): SQL {
  switch (group) {
    case 'beta_tester':
      return sql`exists (select 1 from ${invitations} where ${invitations.kind} = 'card' and ${invitations.acceptedBy} = ${supportRequests.createdBy} and ${invitations.deletedAt} is null)`;
  }
}

function filterArms(
  reader: SupportReader,
  { about, status, errorCode, view, senderGroup }: SupportRequestFilter,
): (SQL | undefined)[] {
  return [
    view ? viewArm(reader, view) : undefined,
    about ? eq(supportRequests.about, about) : undefined,
    status ? statusIs(status) : undefined,
    errorCode === undefined ? undefined : eq(supportRequests.errorCode, errorCode),
    senderGroup ? senderArm(senderGroup) : undefined,
  ];
}

export function findSupportRequestPage(
  reader: SupportReader,
  filter: SupportRequestFilter,
  page: PageRequest,
) {
  return findPage(
    supportRequests,
    orderOf(filter),
    page,
    and(readerScope(reader), ...filterArms(reader, filter)),
  ).then(readAsOfNow);
}

export function findSupportRequestCount(
  reader: SupportReader,
  filter: SupportRequestFilter,
  start: Cursor | undefined,
): Promise<PageCount> {
  return findPageCount(
    supportRequests,
    orderOf(filter),
    start,
    and(readerScope(reader), ...filterArms(reader, filter)),
  );
}

/**
 * How many requests each view holds among those the reader may see and the filter’s About, error number and sender group leave. One
 * query, so the tab row never asks six times.
 */
export async function findSupportViewCounts(
  reader: SupportReader,
  { about, errorCode, senderGroup }: SupportRequestFilter,
): Promise<SupportViewCounts> {
  const [row] = await selectFrom(
    supportRequests,
    and(
      notSoftDeleted(supportRequests),
      readerScope(reader),
      ...filterArms(reader, { about, errorCode, senderGroup }),
    ),
    {
      aggregate: Object.fromEntries(
        SUPPORT_VIEWS.map(({ value }) => [
          value,
          sql<number>`count(*) filter (where ${viewArm(reader, value)})::int`,
        ]),
      ) as Record<SupportView, SQL<number>>,
      over: {},
    },
  );
  return Object.fromEntries(
    SUPPORT_VIEWS.map(({ value }) => [value, row?.[value] ?? 0]),
  ) as SupportViewCounts;
}

export function findSupportRequestForReader(reader: SupportReader, id: string) {
  return selectOne(
    supportRequests,
    and(notSoftDeleted(supportRequests), eq(supportRequests.id, id), readerScope(reader)),
  ).then(oneAsOfNow);
}

/** One page of the sender's own requests, newest first. The finder ANDs `created_by` itself. */
export function findOwnSupportRequestPage(
  userId: string,
  page: PageRequest,
): Promise<PageEntry<typeof supportRequests.$inferSelect>[]> {
  return findPage(supportRequests, OWN_ORDER, page, eq(supportRequests.createdBy, userId)).then(
    readAsOfNow,
  );
}

export function findOwnSupportRequestCount(
  userId: string,
  start: Cursor | undefined,
): Promise<PageCount> {
  return findPageCount(supportRequests, OWN_ORDER, start, eq(supportRequests.createdBy, userId));
}

export async function findOwnSupportStatusCounts(userId: string): Promise<SupportStatusCounts> {
  const [row] = await selectFrom(
    supportRequests,
    and(notSoftDeleted(supportRequests), eq(supportRequests.createdBy, userId)),
    {
      aggregate: {
        open: sql<number>`count(*) filter (where ${supportRequests.status} in ('open', 'waiting_on_sender'))::int`,
        closed: sql<number>`count(*) filter (where ${supportRequests.status} in ('resolved', 'closed'))::int`,
      },
      over: {},
    },
  );
  return { open: row?.open ?? 0, closed: row?.closed ?? 0 };
}

/**
 * What the account menu counts for a viewer in one query: open requests assigned to them, and their own requests waiting on them.
 * Not cached: both are the viewer's. The caller decides whether an assignment counts for this role.
 */
export async function findSupportMenuCounts(userId: string): Promise<SupportMenuCounts> {
  const [row] = await selectFrom(supportRequests, notSoftDeleted(supportRequests), {
    aggregate: {
      assignedOpen: sql<number>`count(*) filter (where ${supportRequests.status} = 'open' and ${supportRequests.assignedTo} = ${userId})::int`,
      waitingOnMe: sql<number>`count(*) filter (where ${supportRequests.status} = 'waiting_on_sender' and ${supportRequests.createdBy} = ${userId})::int`,
    },
    over: {},
  });
  return { assignedOpen: row?.assignedOpen ?? 0, waitingOnMe: row?.waitingOnMe ?? 0 };
}

export function findOwnSupportRequest(userId: string, id: string) {
  return selectOne(
    supportRequests,
    and(
      notSoftDeleted(supportRequests),
      eq(supportRequests.id, id),
      eq(supportRequests.createdBy, userId),
    ),
  ).then(oneAsOfNow);
}

/**
 * The signed-out request whose mailed link hashes to `hash`, or `undefined` when none does. A request a real account holds, or
 * one anonymised, has no address left on the row, so it never matches.
 */
export function findSupportRequestByViewTokenHash(hash: string) {
  return selectOne(
    supportRequests,
    and(
      notSoftDeleted(supportRequests),
      eq(supportRequests.viewTokenHash, hash),
      sql`${supportRequests.viewTokenExpiresAt} > now()`,
      isNotNull(supportRequests.senderEmail),
      notAnonymised,
    ),
  ).then(oneAsOfNow);
}

/** The public replies on a request, oldest first: no internal note among them. */
export function findPublicSupportReplies(requestId: string) {
  return selectFrom(
    supportReplies,
    and(
      notSoftDeleted(supportReplies),
      eq(supportReplies.requestId, requestId),
      // A reply's visibility, not a spell's.
      // oxlint-disable-next-line sorrel/spell-visibility-read-in-one-place
      eq(supportReplies.visibility, 'public'),
    ),
  );
}

export async function countSenderRepliesSince(requestId: string, since: Date): Promise<number> {
  const rows = await selectFrom(
    supportReplies,
    and(
      notSoftDeleted(supportReplies),
      eq(supportReplies.requestId, requestId),
      eq(supportReplies.authorRole, 'sender'),
      gte(supportReplies.createdAt, since),
    ),
  );
  return rows.length;
}

export function findOwnSupportFollowUp(userId: string, id: string) {
  return selectOne(
    supportRequests,
    and(
      notSoftDeleted(supportRequests),
      eq(supportRequests.linkedFrom, id),
      eq(supportRequests.createdBy, userId),
    ),
  ).then(oneAsOfNow);
}

export const timeoutStands = and(
  isNull(supportTimeouts.liftedAt),
  noEndOrAhead(supportTimeouts.until),
) as SQL;

// The rows that stand on a sender; the send lock reads them inside its own transaction by the same predicate.
const standingOnUser = (userId: string): SQL =>
  and(notSoftDeleted(supportTimeouts), eq(supportTimeouts.userId, userId), timeoutStands) as SQL;

/**
 * The end of the time-out standing on the sender, latest first, `until` null when one has no end date; `undefined` when none
 * stands.
 */
export async function findStandingSupportTimeout(
  userId: string,
): Promise<StandingTimeout | undefined> {
  const rows = await selectFrom(supportTimeouts, standingOnUser(userId));
  return latestEnd(rows);
}

/**
 * The end of the time-out standing on the address whose count key is `addressKey`, latest first, `until` null when one has no end
 * date; `undefined` when none stands. A time-out set on a signed-out sender binds the address it wrote from.
 */
export async function findStandingSupportTimeoutByAddress(
  addressKey: string,
): Promise<StandingTimeout | undefined> {
  const rows = await selectFrom(
    supportTimeouts,
    and(notSoftDeleted(supportTimeouts), eq(supportTimeouts.addressKey, addressKey), timeoutStands),
  );
  return latestEnd(rows);
}

/** The latest end among standing time-outs: none at all (no end date) wins over any date. */
function latestEnd(rows: readonly { until: Date | null }[]): StandingTimeout | undefined {
  if (rows.length === 0) return undefined;
  if (rows.some((row) => row.until === null)) return { until: null };
  return { until: new Date(Math.max(...rows.map((row) => row.until?.getTime() ?? 0))) };
}

export function findReplyAwaitingNotice(id: string) {
  return selectOne(
    supportReplies,
    and(
      notSoftDeleted(supportReplies),
      eq(supportReplies.id, id),
      eq(supportReplies.authorRole, 'staff'),
      // A reply's visibility, not a spell's.
      // oxlint-disable-next-line sorrel/spell-visibility-read-in-one-place
      eq(supportReplies.visibility, 'public'),
      isNull(supportReplies.noticeSentAt),
    ),
  );
}

/**
 * One page of request ids matching `where`, in id order after `after`, at most `limit`: the retention job's stage reads. Each
 * caller puts `notSoftDeleted` in its own `where`, so the soft-delete guard sees it in every exported finder.
 */
async function retentionPage(
  where: SQL | undefined,
  after: string | null,
  limit: number,
): Promise<string[]> {
  const rows = await selectFrom(
    supportRequests,
    and(where, after === null ? undefined : gt(supportRequests.id, after)),
    {
      aggregate: { id: sql<string>`${supportRequests.id}` },
      over: {},
      orderBy: [supportRequests.id],
      limit,
    },
  );
  return rows.map((row) => row.id);
}

/**
 * A page of ids of resolved requests still owed their closing-soon notice: resolved at or before `dueBy` and after
 * `lapsedBy`, so inside the last days before the close, with none sent yet. In id order after `after`, at most `limit`.
 */
export function findClosingNoticesDue(
  dueBy: Date,
  lapsedBy: Date,
  after: string | null,
  limit: number,
): Promise<string[]> {
  return retentionPage(
    and(notSoftDeleted(supportRequests), closingNoticeDue(dueBy, lapsedBy)),
    after,
    limit,
  );
}

/**
 * Those of `ids` still owed their closing-soon notice by the rule `findClosingNoticesDue` reads, in id order: what a notice batch
 * mails, so an id not yet due, already noticed or reopened since its page was read gets nothing.
 */
export function findClosingNoticesDueAmong(
  dueBy: Date,
  lapsedBy: Date,
  ids: readonly string[],
): Promise<string[]> {
  if (ids.length === 0) return Promise.resolve([]);
  return retentionPage(
    and(
      notSoftDeleted(supportRequests),
      closingNoticeDue(dueBy, lapsedBy),
      inArray(supportRequests.id, [...ids]),
    ),
    null,
    ids.length,
  );
}

/** Resolved at or before `dueBy` and after `lapsedBy`, so inside the last days before the close, with no notice sent yet. */
function closingNoticeDue(dueBy: Date, lapsedBy: Date): SQL | undefined {
  return and(
    eq(supportRequests.status, 'resolved'),
    isNull(supportRequests.closingNoticeSentAt),
    lte(supportRequests.resolvedAt, dueBy),
    gt(supportRequests.resolvedAt, lapsedBy),
  );
}

// A request the System account owns has been anonymised.
const notAnonymised = ne(supportRequests.createdBy, SYSTEM_ACTOR_ID);

/** Resolved at or before `cutoff`: due to close. The finder and the closing writer both read it. */
const dueToClose = (cutoff: Date): SQL =>
  and(eq(supportRequests.status, 'resolved'), lte(supportRequests.resolvedAt, cutoff)) as SQL;

/** Closed at or before `cutoff` and not yet anonymised: due to anonymise. The finder and the anonymising writer both read it. */
const dueToAnonymise = (cutoff: Date): SQL =>
  and(
    eq(supportRequests.status, 'closed'),
    lte(supportRequests.closedAt, cutoff),
    notAnonymised,
  ) as SQL;

/** A page of ids of resolved requests resolved at or before `cutoff`, so due to close. In id order after `after`, at most `limit`. */
export function findSupportRequestsDueToClose(
  cutoff: Date,
  after: string | null,
  limit: number,
): Promise<string[]> {
  return retentionPage(and(notSoftDeleted(supportRequests), dueToClose(cutoff)), after, limit);
}

/**
 * A page of ids of requests closed at or before `cutoff` and not yet anonymised, so due to be. In id order after `after`,
 * at most `limit`.
 */
export function findSupportRequestsDueToAnonymise(
  cutoff: Date,
  after: string | null,
  limit: number,
): Promise<string[]> {
  return retentionPage(and(notSoftDeleted(supportRequests), dueToAnonymise(cutoff)), after, limit);
}

export function findSupportTimeoutById(id: string) {
  return selectOne(
    supportTimeouts,
    and(notSoftDeleted(supportTimeouts), eq(supportTimeouts.id, id)),
  );
}

/**
 * The live replies to these requests, oldest first, of the requests the viewer may read: the join to the request is in SQL, so a
 * reply to a request outside the viewer's scope never leaves the database.
 */
export function findSupportRepliesFor(viewer: SupportViewer, requestIds: readonly string[]) {
  if (requestIds.length === 0) return Promise.resolve([]);
  return selectFrom(
    supportReplies,
    and(
      notSoftDeleted(supportReplies),
      inArray(supportReplies.requestId, [...requestIds]),
      existsIn(
        supportRequests,
        and(
          notSoftDeleted(supportRequests),
          eq(supportRequests.id, supportReplies.requestId),
          viewerScope(viewer),
        ),
      ),
      internalNotesScope(viewer),
    ),
  );
}

/**
 * An internal note is staff's: a sender never reads one, even on their own request. A keeper reads every note, a curator those on
 * a request marked for curators or assigned to them. A public reply passes for everyone.
 */
function internalNotesScope(viewer: SupportViewer): SQL | undefined {
  if (viewer.role === 'admin') return undefined;
  // A reply's visibility, not a spell's.
  // oxlint-disable-next-line sorrel/spell-visibility-read-in-one-place
  const isPublic = eq(supportReplies.visibility, 'public');
  if (viewer.role === 'user') return isPublic;
  return or(
    isPublic,
    existsIn(
      supportRequests,
      and(
        eq(supportRequests.id, supportReplies.requestId),
        or(eq(supportRequests.curatorVisible, true), eq(supportRequests.assignedTo, viewer.userId)),
      ),
    ),
  );
}

/** The ids among `userIds` that accepted a printed card: derived from the invitation, never
 * stored. */
export async function findCardAcceptorIds(userIds: readonly string[]): Promise<Set<string>> {
  if (userIds.length === 0) return new Set();
  const rows = await selectFrom(
    invitations,
    and(
      notSoftDeleted(invitations),
      eq(invitations.kind, 'card'),
      inArray(invitations.acceptedBy, [...userIds]),
    ),
  );
  return new Set(rows.flatMap((row) => (row.acceptedBy ? [row.acceptedBy] : [])));
}

/** The live time-outs set on these senders, newest first. The service lets a keeper alone
 * ask. */
export function findSupportTimeoutsFor(userIds: readonly string[]) {
  if (userIds.length === 0) return Promise.resolve([]);
  return selectFrom(
    supportTimeouts,
    and(notSoftDeleted(supportTimeouts), inArray(supportTimeouts.userId, [...userIds])),
  );
}

/** The live time-outs set on these addresses, newest first. The service lets a keeper alone
 * ask. */
export function findSupportTimeoutsForAddresses(addressKeys: readonly string[]) {
  if (addressKeys.length === 0) return Promise.resolve([]);
  return selectFrom(
    supportTimeouts,
    and(notSoftDeleted(supportTimeouts), inArray(supportTimeouts.addressKey, [...addressKeys])),
  );
}

/**
 * The time-out standing on each of these senders, not lifted and not yet ended, in one query: the user list's Support
 * Time-Out column for a page of users. Under the `SiteAdmin` proof: who is timed out is a keeper's to read.
 */
export function findStandingSupportTimeoutsFor(_admin: SiteAdmin, userIds: readonly string[]) {
  if (userIds.length === 0) return Promise.resolve([]);
  return selectFrom(
    supportTimeouts,
    and(
      notSoftDeleted(supportTimeouts),
      inArray(supportTimeouts.userId, [...userIds]),
      timeoutStands,
    ),
  );
}

/**
 * The first number of the two-number advisory lock a sender's support sends take (the second hashes the sender's id). A fixed
 * namespace keeps it from meeting any other advisory lock.
 */
export const SUPPORT_SEND_LOCK_NAMESPACE = 0x53555031;

export function supportWrites({
  tx,
  session,
  insert,
  update,
}: WriterContext): Pick<
  AuditWriter,
  | 'lockSupportSender'
  | 'countSignedOutSend'
  | 'countSignedOutView'
  | 'moveSupportRequest'
  | 'closeIdleResolvedSupportRequests'
  | 'markClosingNoticeSent'
  | 'markReplyNoticeSent'
  | 'anonymiseClosedSupportRequests'
  | 'setSupportViewToken'
  | 'claimSupportRequestsByEmail'
> {
  // One key's count: its advisory lock first, then the live row, started again when its window has passed.
  async function countKey(
    kind: 'address' | 'client',
    key: string,
    now: Date,
    windowSeconds: number,
  ): Promise<number> {
    await tx.execute(
      sql`select pg_advisory_xact_lock(${SUPPORT_SEND_LOCK_NAMESPACE}, hashtext(${kind + '|' + key}))`,
    );
    const [row] = await tx
      .select()
      .from(supportSendCounts)
      .where(
        and(
          notSoftDeleted(supportSendCounts),
          eq(supportSendCounts.kind, kind),
          eq(supportSendCounts.key, key),
        ),
      );
    if (!row) {
      await insert(supportSendCounts, { kind, key, windowStart: now, count: 1 });
      return 1;
    }
    const expired = row.windowStart.getTime() <= now.getTime() - windowSeconds * 1000;
    const count = expired ? 1 : row.count + 1;
    await update(
      supportSendCounts,
      { count, windowStart: expired ? now : row.windowStart },
      eq(supportSendCounts.id, row.id),
    );
    return count;
  }

  return {
    // Only the stand-in's rows whose address is the verified account's own move to it, with their sender replies; the address and
    // view link are cleared so the one-sender CHECK never sees an address with an ordinary account. The audit writer strips
    // `created_by` from what it sets, so these go to the transaction itself.
    claimSupportRequestsByEmail: async (realId, email, addressKey) => {
      const rows = await tx
        .update(supportRequests)
        .set({
          createdBy: realId,
          updatedBy: sql`case when ${supportRequests.updatedBy} = ${SIGNED_OUT_SENDER_ID}::uuid then ${realId}::uuid else ${supportRequests.updatedBy} end`,
          resolvedBy: sql`case when ${supportRequests.resolvedBy} = ${SIGNED_OUT_SENDER_ID}::uuid then ${realId}::uuid else ${supportRequests.resolvedBy} end`,
          senderEmail: null,
          viewTokenHash: null,
          viewTokenExpiresAt: null,
        })
        .where(
          and(
            notSoftDeleted(supportRequests),
            eq(supportRequests.createdBy, SIGNED_OUT_SENDER_ID),
            sql`lower(${supportRequests.senderEmail}) = lower(${email})`,
          ),
        )
        .returning({ id: supportRequests.id });
      if (rows.length > 0) {
        await tx
          .update(supportReplies)
          .set({ createdBy: realId, updatedBy: realId })
          .where(
            and(
              inArray(
                supportReplies.requestId,
                rows.map((row) => row.id),
              ),
              eq(supportReplies.authorRole, 'sender'),
              eq(supportReplies.createdBy, SIGNED_OUT_SENDER_ID),
            ),
          );
      }
      // The standing time-outs that bind this address alone now bind the account that proved it.
      await tx
        .update(supportTimeouts)
        .set({ userId: realId })
        .where(
          and(
            isNull(supportTimeouts.userId),
            eq(supportTimeouts.addressKey, addressKey),
            timeoutStands,
          ),
        );
      return rows.length;
    },
    countSignedOutView: (clientKey, now, windowSeconds) =>
      countKey('client', clientKey, now, windowSeconds),
    countSignedOutSend: async (addressKey, clientKey, now, windowSeconds) => ({
      // Fixed order, so two sends taking both locks cannot wait on each other.
      address: await countKey('address', addressKey, now, windowSeconds),
      client: await countKey('client', clientKey, now, windowSeconds),
    }),
    moveSupportRequest: (id, ownerId, from, values) =>
      update(
        supportRequests,
        values,
        and(
          eq(supportRequests.id, id),
          inArray(supportRequests.status, [...from]),
          // A lapsed resolved request reads as closed, so it moves as a closed one would.
          not(lapsedResolved),
          ownerId === null ? undefined : eq(supportRequests.createdBy, ownerId),
        ),
      ),
    // Closed as of the day it lapsed, the date readers already show, so a late close does not put off the anonymising.
    // The status and cutoff are read again here, so an id reopened since the page was read is left alone.
    closeIdleResolvedSupportRequests: (cutoff, ids) =>
      update(
        supportRequests,
        {
          status: 'closed',
          closedAt: sql`${supportRequests.resolvedAt} + make_interval(days => ${RESOLVED_CLOSES_AFTER_DAYS})`,
        },
        and(inArray(supportRequests.id, [...ids]), dueToClose(cutoff)),
      ),
    markClosingNoticeSent: (id, sentAt) =>
      update(
        supportRequests,
        { closingNoticeSentAt: sentAt },
        and(
          eq(supportRequests.id, id),
          eq(supportRequests.status, 'resolved'),
          isNull(supportRequests.closingNoticeSentAt),
        ),
      ),
    // Only a signed-out request has a link: one whose address is still on the row.
    setSupportViewToken: (id, hash, expiresAt) =>
      update(
        supportRequests,
        { viewTokenHash: hash, viewTokenExpiresAt: expiresAt },
        and(eq(supportRequests.id, id), isNotNull(supportRequests.senderEmail)),
      ),
    markReplyNoticeSent: (id, sentAt) =>
      update(
        supportReplies,
        { noticeSentAt: sentAt },
        and(eq(supportReplies.id, id), isNull(supportReplies.noticeSentAt)),
      ),
    // The sender leaves the row in one statement, so the one-sender CHECK never sees an address without the signed-out
    // sender: `created_by` passes to the System account, which no request is otherwise created by, and which marks the row done.
    // The audit writer strips `created_by` from what it sets, so this one statement goes to the transaction itself.
    anonymiseClosedSupportRequests: async (cutoff, ids) => {
      const rows = await tx
        .update(supportRequests)
        .set({
          subject: ANONYMISED_SUBJECT,
          message: '',
          path: '',
          errorDetail: null,
          senderEmail: null,
          viewTokenHash: null,
          viewTokenExpiresAt: null,
          resolvedBy: sql`case when ${supportRequests.resolvedBy} = ${supportRequests.createdBy} then null else ${supportRequests.resolvedBy} end`,
          createdBy: SYSTEM_ACTOR_ID,
          updatedBy: session.userId,
        })
        .where(
          and(
            notSoftDeleted(supportRequests),
            inArray(supportRequests.id, [...ids]),
            dueToAnonymise(cutoff),
          ),
        )
        .returning();
      if (rows.length === 0) return rows;
      await tx
        .update(supportReplies)
        .set({
          body: '',
          createdBy: sql`case when ${supportReplies.authorRole} = 'sender' then ${SYSTEM_ACTOR_ID}::uuid else ${supportReplies.createdBy} end`,
          updatedBy: session.userId,
        })
        .where(
          inArray(
            supportReplies.requestId,
            rows.map((row) => row.id),
          ),
        );
      return rows;
    },
    // An advisory lock, not a row lock: the send limit counts rows that do not exist yet, so there is no row to lock. Taken
    // first in the send's transaction, so a second send from the same account waits and then counts the first. Both reads are
    // in that transaction, as its connection is the one the lock holds. Released at commit.
    lockSupportSender: async (userId, windowSeconds) => {
      await tx.execute(
        sql`select pg_advisory_xact_lock(${SUPPORT_SEND_LOCK_NAMESPACE}, hashtext(${userId}))`,
      );
      const recent = await tx
        .select({ id: supportRequests.id })
        .from(supportRequests)
        .where(
          and(
            notSoftDeleted(supportRequests),
            eq(supportRequests.createdBy, userId),
            sql`${supportRequests.createdAt} > now() - make_interval(secs => ${windowSeconds})`,
          ),
        );
      const timeouts = await tx
        .select({ until: supportTimeouts.until })
        .from(supportTimeouts)
        .where(standingOnUser(userId));
      return { recent: recent.length, timedOut: latestEnd(timeouts) };
    },
  };
}
