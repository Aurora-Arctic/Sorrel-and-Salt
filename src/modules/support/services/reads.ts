import 'server-only';
import {
  findManyByIds,
  findSupportRepliesFor,
  findSupportTimeoutsFor,
  findSupportTimeoutsForAddresses,
  findStandingSupportTimeoutsFor,
} from '../../../db/repository';
import { Forbidden } from '../../../lib/errors';
import { addressCountKey } from '../../../lib/send-count-key';
import type { Session } from '../../../lib/session';
import { inIdOrder } from '../../../lib/in-id-order';
import { assertSiteAdmin } from '../../identity';
import type { UserRow } from '../../identity';
import { users } from '../../identity/schema/users';
import type { SupportReplyRow, SupportTimeoutRow } from '../types';
import { requireVerified, viewerOf } from './access';
import { supportTiersForSenders } from './lifecycle';
import type { SupportSenderTier } from './lifecycle';

// The batches behind the loaders on a request: its replies, its sender's time-outs, and the people named on it.

/**
 * The replies to each request, oldest first, none where the viewer may not read the request: a reader's scope is in the
 * query, so a hidden request's replies are never fetched.
 */
export async function repliesForRequests(
  session: Session,
  requestIds: readonly string[],
): Promise<SupportReplyRow[][]> {
  requireVerified(session);
  const rows = await findSupportRepliesFor(viewerOf(session), requestIds);
  const sorted = [...rows].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  return requestIds.map((id) => sorted.filter((reply) => reply.requestId === id));
}

/** The time-outs set on each sender, newest first, to a site keeper alone: anyone else's batch is refused in every slot. */
export async function timeoutsForSenders(
  session: Session,
  userIds: readonly string[],
): Promise<(SupportTimeoutRow[] | Forbidden)[]> {
  try {
    assertSiteAdmin(session, 'Only a site keeper may read a sender’s time-outs');
  } catch (error) {
    if (!(error instanceof Forbidden)) throw error;
    return userIds.map(() => error);
  }
  const rows = await findSupportTimeoutsFor(userIds);
  const sorted = [...rows].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  return userIds.map((id) => sorted.filter((timeout) => timeout.userId === id));
}

/**
 * The time-outs set on each signed-out sender's address, newest first, for the emails asked. A site admin's alone: every
 * slot of anyone else's load is refused. A signed-out sender has no account, so a time-out names the address key alone.
 */
export async function timeoutsForAddresses(
  session: Session,
  emails: readonly string[],
): Promise<(SupportTimeoutRow[] | Forbidden)[]> {
  try {
    assertSiteAdmin(session, 'Only a site keeper may read a sender’s time-outs');
  } catch (error) {
    if (!(error instanceof Forbidden)) throw error;
    return emails.map(() => error);
  }
  const keys = emails.map(addressCountKey);
  const rows = await findSupportTimeoutsForAddresses(keys);
  const sorted = [...rows].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  return keys.map((key) => sorted.filter((timeout) => timeout.addressKey === key));
}

/**
 * The time-out standing on each sender, in the order asked, undefined where none stands: one query for a page of the user
 * list. To a site keeper alone. Of several, one with no end date is shown, else the one ending last.
 */
/** A time-out's end for sorting, with no end date as the latest of all. */
const endsAt = (row: SupportTimeoutRow): number => row.until?.getTime() ?? Number.POSITIVE_INFINITY;

export async function standingTimeoutsOf(
  session: Session,
  userIds: readonly string[],
): Promise<(SupportTimeoutRow | undefined)[]> {
  const admin = assertSiteAdmin(session, 'Only a site keeper may read a sender’s time-outs');
  const rows = await findStandingSupportTimeoutsFor(admin, userIds);
  return userIds.map(
    (id) => rows.filter((row) => row.userId === id).sort((a, b) => endsAt(b) - endsAt(a))[0],
  );
}

/**
 * The live user behind each id, null where none is live. Beside the identity module's two user loaders: the people on a request
 * are named to the curators who may read it, which the admin-only loader refuses and the shared-coven one hides. The ids come
 * from requests, replies and time-outs the caller was already allowed to read.
 */
export async function usersNamedOnRequests(
  session: Session,
  ids: readonly string[],
): Promise<(UserRow | null)[]> {
  requireVerified(session);
  const rows = await findManyByIds(users, [...ids]);
  // A curator is named the people on a request but not their addresses, bar their own.
  const named =
    session.role === 'curator'
      ? rows.map((row) => (row.id === session.userId ? row : { ...row, email: '' }))
      : rows;
  return inIdOrder(ids, named, () => null);
}

/** The tier of each sender, to staff alone: anyone else's batch is refused in every slot. */
export async function tiersForSenders(
  session: Session,
  userIds: readonly string[],
): Promise<(SupportSenderTier | Forbidden)[]> {
  try {
    return await supportTiersForSenders(session, userIds);
  } catch (error) {
    if (!(error instanceof Forbidden)) throw error;
    return userIds.map(() => error);
  }
}
