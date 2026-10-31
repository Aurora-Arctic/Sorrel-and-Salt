import 'server-only';
import {
  findManyByIds,
  findSupportRepliesFor,
  findSupportTimeoutsFor,
} from '../../../db/repository';
import { Forbidden } from '../../../lib/errors';
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

/** The time-outs set on each sender, newest first, to a site admin alone: anyone else's batch is refused in every slot. */
export async function timeoutsForSenders(
  session: Session,
  userIds: readonly string[],
): Promise<(SupportTimeoutRow[] | Forbidden)[]> {
  try {
    assertSiteAdmin(session, 'Only a site admin may read a sender’s time-outs');
  } catch (error) {
    if (!(error instanceof Forbidden)) throw error;
    return userIds.map(() => error);
  }
  const rows = await findSupportTimeoutsFor(userIds);
  const sorted = [...rows].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  return userIds.map((id) => sorted.filter((timeout) => timeout.userId === id));
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
