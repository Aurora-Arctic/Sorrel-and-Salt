import 'server-only';
import { findOneById } from '../../../db/repository';
import type { PrivilegeDeclaration } from '../../../db/repository';
import { Forbidden, NotFound } from '../../../lib/errors';
import type { Session } from '../../../lib/session';
import { users } from '../schema/users';
import type { UserRow } from '../types';

// What an admin's change to a user, and an admin's batch read of users, are
// made of, written once for the role service, coven creation's approval and
// the admin invitations. Internal to the module; the index exports
// no part of it.

/** Whether the session's role is `admin`, for a caller answering a batch that refuses slot by slot; otherwise use `assertSiteAdmin`. */
export function isSiteAdmin(session: Session): boolean {
  return session.role === 'admin';
}

/** A batch every slot of which is refused in `reason`'s words: a non-admin's DataLoader batch. */
export function refuseBatch(ids: readonly string[], reason: string): Forbidden[] {
  return ids.map(() => new Forbidden(reason));
}

/**
 * The live user, or `NotFound`: a soft-deleted one reads as no one.
 *
 * @throws {NotFound} no live user has this id.
 */
export async function liveUser(userId: string): Promise<UserRow> {
  const user = await findOneById(users, userId);
  if (!user) throw new NotFound('No such user');
  return user;
}

/** An admin's change as the privilege trigger records it: `via: 'admin'`, with the confirmation's optional `note`, trimmed, blank as none. */
export function adminDeclaration(note: string | undefined): PrivilegeDeclaration {
  return { via: 'admin', note: note?.trim() || undefined };
}
