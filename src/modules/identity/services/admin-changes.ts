import 'server-only';
import { findOneById } from '../../../db/repository';
import type { PrivilegeDeclaration } from '../../../db/repository';
import { Forbidden, NotFound } from '../../../lib/errors';
import type { Session } from '../../../lib/session';
import { users } from '../schema/users';
import type { UserRow } from '../types';

// What an admin's change to a user, and an admin's batch read of users, are
// made of, written once for the role service, coven creation's approval and
// the admin invitations (MB.210). Internal to the module; the index exports
// no part of it.

/**
 * Whether the session's role is `admin`, read off the user's row by the
 * request. For a caller answering a batch, which refuses slot by slot rather
 * than throwing; anything else asks `assertSiteAdmin`, which returns the proof.
 */
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

/**
 * An admin's change as the privilege trigger records it (MB.195): `via:
 * 'admin'`, with `note`, the confirmation's optional reason, trimmed and a
 * blank one as none — the same note an admin invitation stores for its
 * acceptance to record.
 */
export function adminDeclaration(note: string | undefined): PrivilegeDeclaration {
  return { via: 'admin', note: note?.trim() || undefined };
}
