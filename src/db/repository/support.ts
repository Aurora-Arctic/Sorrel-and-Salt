import { and, eq, inArray, isNull, or, sql, type SQL } from 'drizzle-orm';
import { supportReplies } from '../../modules/support/schema/support-replies';
import { supportRequests } from '../../modules/support/schema/support-requests';
import { supportTimeouts } from '../../modules/support/schema/support-timeouts';
import { findPage, findPageCount } from './finders';
import { notSoftDeleted } from './predicates';
import { existsIn, selectFrom, selectOne } from './select';
import type { Cursor, PageCount, PageEntry, PageRequest } from '../../lib/types';
import type { SortPart, SupportReader, SupportRequestFilter, SupportViewer } from './types';

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

/** How many requests the sender has made since `windowSeconds` ago: the count the send limit reads. */
export async function countSupportRequestsInWindow(
  userId: string,
  windowSeconds: number,
): Promise<number> {
  const rows = await selectFrom(
    supportRequests,
    and(
      notSoftDeleted(supportRequests),
      eq(supportRequests.createdBy, userId),
      sql`${supportRequests.createdAt} > now() - make_interval(secs => ${windowSeconds})`,
    ),
  );
  return rows.length;
}

/** The end of the sender's active time-out (not lifted, not yet passed), the latest if there are several, or `undefined`. */
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
  return rows.map((row) => row.until).sort((a, b) => b.getTime() - a.getTime())[0];
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
