import { and, eq, inArray, isNull, lte, or, sql, type SQL } from 'drizzle-orm';
import { invitations } from '../../modules/coven/schema/invitations';
import { supportReplies } from '../../modules/support/schema/support-replies';
import { supportRequests } from '../../modules/support/schema/support-requests';
import { supportSendCounts } from '../../modules/support/schema/support-send-counts';
import { supportTimeouts } from '../../modules/support/schema/support-timeouts';
import { SUPPORT_VIEWS } from '../../lib/support-path';
import type { SupportView } from '../../lib/support-path';
import { findPage, findPageCount } from './finders';
import { notSoftDeleted } from './predicates';
import { existsIn, selectFrom, selectOne } from './select';
import type { Cursor, PageCount, PageEntry, PageRequest } from '../../lib/types';
import type {
  AuditWriter,
  SortPart,
  SupportReader,
  SupportStatusCounts,
  SupportViewCounts,
  SupportRequestFilter,
  SupportViewer,
  WriterContext,
} from './types';

// The support finders. A request is the account's, not a coven's, so no `Membership` scopes it: what a reader may see is
// spelled here in SQL, so a request outside it never reaches a resolver (claude-docs/design-decisions/m15.1-support-form.md, "The curator view").

/** What a curator reads: a request marked for curators, or assigned to them. An admin reads every request. */
function readerScope(reader: SupportReader): SQL | undefined {
  if (reader.role === 'admin') return undefined;
  return or(
    eq(supportRequests.curatorVisible, true),
    eq(supportRequests.assignedTo, reader.proof.userId),
  );
}

/** A request the viewer may read in any capacity: their own, and by role the reader scope on top. */
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
  { expression: sql`-extract(epoch from ${supportRequests.createdAt})`, type: 'numeric' },
];

const NEWEST_FIRST: readonly SortPart[] = [
  { expression: sql`-extract(epoch from ${supportRequests.createdAt})`, type: 'numeric' },
];

// The queue views: beta testers first, then the oldest sender activity, which a request with none dates from its sending.
const QUEUE_ORDER: readonly SortPart[] = [
  {
    expression: sql`case when exists (select 1 from ${invitations} where ${invitations.kind} = 'card' and ${invitations.acceptedBy} = ${supportRequests.createdBy} and ${invitations.deletedAt} is null) then 0 else 1 end`,
    type: 'integer',
  },
  {
    expression: sql`extract(epoch from coalesce(${supportRequests.lastSenderActivityAt}, ${supportRequests.createdAt}))`,
    type: 'numeric',
  },
];

const QUEUE_VIEWS: readonly SupportView[] = ['needs_staff', 'mine', 'unassigned'];

const orderOf = ({ view }: SupportRequestFilter): readonly SortPart[] =>
  view && QUEUE_VIEWS.includes(view) ? QUEUE_ORDER : REQUEST_ORDER;

/** What a view holds: the status, and for the queue views who holds the request. */
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
      return eq(supportRequests.status, 'resolved');
    case 'closed':
      return eq(supportRequests.status, 'closed');
  }
}

function filterArms(
  reader: SupportReader,
  { about, status, errorCode, view }: SupportRequestFilter,
): (SQL | undefined)[] {
  return [
    view ? viewArm(reader, view) : undefined,
    about ? eq(supportRequests.about, about) : undefined,
    status ? eq(supportRequests.status, status) : undefined,
    errorCode === undefined ? undefined : eq(supportRequests.errorCode, errorCode),
  ];
}

/** One page of the requests the reader may see, open ahead of resolved and newest first within each. */
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
  );
}

/** How many rows `findSupportRequestPage` pages, and how many come before `start`, a page's first row. */
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
 * How many requests each view holds among those the reader may see and the filter’s About and error number leave. One
 * query, so the tab row never asks six times.
 */
export async function findSupportViewCounts(
  reader: SupportReader,
  { about, errorCode }: SupportRequestFilter,
): Promise<SupportViewCounts> {
  const [row] = await selectFrom(
    supportRequests,
    and(
      notSoftDeleted(supportRequests),
      readerScope(reader),
      ...filterArms(reader, { about, errorCode }),
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

/** The request the reader may see, or `undefined` for one that is absent or outside their scope. */
export function findSupportRequestForReader(reader: SupportReader, id: string) {
  return selectOne(
    supportRequests,
    and(notSoftDeleted(supportRequests), eq(supportRequests.id, id), readerScope(reader)),
  );
}

/** One page of the sender's own requests, newest first. The finder ANDs `created_by` itself. */
export function findOwnSupportRequestPage(
  userId: string,
  page: PageRequest,
): Promise<PageEntry<typeof supportRequests.$inferSelect>[]> {
  return findPage(supportRequests, NEWEST_FIRST, page, eq(supportRequests.createdBy, userId));
}

/** How many rows `findOwnSupportRequestPage` pages, and how many come before `start`. */
export function findOwnSupportRequestCount(
  userId: string,
  start: Cursor | undefined,
): Promise<PageCount> {
  return findPageCount(supportRequests, NEWEST_FIRST, start, eq(supportRequests.createdBy, userId));
}

/** How many of the sender's requests are still open (open, waiting on the sender) and how many are done (resolved, closed). */
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

/** The sender's own request, or `undefined` for one that is absent or another sender's. */
export function findOwnSupportRequest(userId: string, id: string) {
  return selectOne(
    supportRequests,
    and(
      notSoftDeleted(supportRequests),
      eq(supportRequests.id, id),
      eq(supportRequests.createdBy, userId),
    ),
  );
}

/** The request the sender opened as a follow-up to this closed one of theirs, or `undefined` when they have not. */
export function findOwnSupportFollowUp(userId: string, id: string) {
  return selectOne(
    supportRequests,
    and(
      notSoftDeleted(supportRequests),
      eq(supportRequests.linkedFrom, id),
      eq(supportRequests.createdBy, userId),
    ),
  );
}

/** When the sender's latest live time-out ends, or `undefined` with none in force. */
export async function findActiveSupportTimeoutEnd(userId: string): Promise<Date | undefined> {
  const rows = await selectFrom(
    supportTimeouts,
    and(
      notSoftDeleted(supportTimeouts),
      eq(supportTimeouts.userId, userId),
      isNull(supportTimeouts.liftedAt),
      sql`${supportTimeouts.until} > now()`,
    ),
  );
  return rows.map((row) => row.until).sort((x, y) => y.getTime() - x.getTime())[0];
}

/** A time-out by id, for an admin to lift. */
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
 * An internal note is staff's: a sender never reads one, even on their own request. An admin reads every note, a curator those on
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

/** The ids among `userIds` that accepted a printed card: the beta-tester tier, derived from the invitation and never stored. */
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

/** The live time-outs set on these senders, newest first. The service lets an admin alone ask. */
export function findSupportTimeoutsFor(userIds: readonly string[]) {
  if (userIds.length === 0) return Promise.resolve([]);
  return selectFrom(
    supportTimeouts,
    and(notSoftDeleted(supportTimeouts), inArray(supportTimeouts.userId, [...userIds])),
  );
}

/**
 * The first number of the two-number advisory lock a sender's support sends take (the second hashes the sender's id). A fixed
 * namespace keeps it from meeting any other advisory lock.
 */
export const SUPPORT_SEND_LOCK_NAMESPACE = 0x53555031;

export function supportWrites({
  tx,
  insert,
  update,
}: WriterContext): Pick<
  AuditWriter,
  | 'lockSupportSender'
  | 'countSignedOutSend'
  | 'moveSupportRequest'
  | 'closeIdleResolvedSupportRequests'
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
    countSignedOutSend: async (address, client, now, windowSeconds) => ({
      // Fixed order, so two sends taking both locks cannot wait on each other.
      address: await countKey('address', address, now, windowSeconds),
      client: await countKey('client', client, now, windowSeconds),
    }),
    moveSupportRequest: (id, ownerId, from, values) =>
      update(
        supportRequests,
        values,
        and(
          eq(supportRequests.id, id),
          inArray(supportRequests.status, [...from]),
          ownerId === null ? undefined : eq(supportRequests.createdBy, ownerId),
        ),
      ),
    closeIdleResolvedSupportRequests: (cutoff, closedAt) =>
      update(
        supportRequests,
        { status: 'closed', closedAt },
        and(eq(supportRequests.status, 'resolved'), lte(supportRequests.resolvedAt, cutoff)),
      ),
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
        .where(
          and(
            notSoftDeleted(supportTimeouts),
            eq(supportTimeouts.userId, userId),
            isNull(supportTimeouts.liftedAt),
            sql`${supportTimeouts.until} > now()`,
          ),
        );
      return {
        recent: recent.length,
        timedOutUntil: timeouts
          .map((row) => row.until)
          .sort((x, y) => y.getTime() - x.getTime())[0],
      };
    },
  };
}
