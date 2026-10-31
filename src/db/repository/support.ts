import { and, eq, inArray, isNull, or, sql, type SQL } from 'drizzle-orm';
import { supportReplies } from '../../modules/support/schema/support-replies';
import { supportRequests } from '../../modules/support/schema/support-requests';
import { supportTimeouts } from '../../modules/support/schema/support-timeouts';
import { findPage, findPageCount } from './finders';
import { notSoftDeleted } from './predicates';
import { existsIn, selectFrom, selectOne } from './select';
import type { Cursor, PageCount, PageEntry, PageRequest } from '../../lib/types';
import type {
  AuditWriter,
  SortPart,
  SupportReader,
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

function filterArms({ kind, status, errorCode }: SupportRequestFilter): (SQL | undefined)[] {
  return [
    kind ? eq(supportRequests.kind, kind) : undefined,
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
    REQUEST_ORDER,
    page,
    and(readerScope(reader), ...filterArms(filter)),
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
    REQUEST_ORDER,
    start,
    and(readerScope(reader), ...filterArms(filter)),
  );
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
    ),
  );
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

export function supportWrites({ tx }: WriterContext): Pick<AuditWriter, 'lockSupportSender'> {
  return {
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
