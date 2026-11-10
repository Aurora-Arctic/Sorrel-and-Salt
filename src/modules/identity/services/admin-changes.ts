import 'server-only';
import { findOneById } from '../../../db/repository';
import type { PrivilegeDeclaration } from '../../../db/repository';
import { Forbidden, NotFound, fieldRefusal } from '../../../lib/errors';
import { limitMessage } from '../../../lib/formats';
import type { Session } from '../../../lib/session';
import { users } from '../schema/users';
import { REASON_LIMIT } from '../validation/reason';
import type { UserRow } from '../types';

/** For a caller answering a batch that refuses slot by slot; otherwise use `assertSiteAdmin`. */
export function isSiteAdmin(session: Session): boolean {
  return session.role === 'admin';
}

export function refuseBatch(ids: readonly string[], reason: string): Forbidden[] {
  return ids.map(() => new Forbidden(reason));
}

/**
 * @throws {NotFound} no live user has this id.
 */
export async function liveUser(userId: string): Promise<UserRow> {
  const user = await findOneById(users, userId);
  if (!user) throw new NotFound('No such user');
  return user;
}

/**
 * A keeper's change as the privilege trigger records it: `via: 'admin'`, with the confirmation's optional `note`, trimmed, blank as none.
 * @throws {ValidationError} on `['note']` when the trimmed note is over 500 characters.
 */
export function adminDeclaration(note: string | undefined): PrivilegeDeclaration {
  const trimmed = note?.trim() || undefined;
  if (trimmed && trimmed.length > REASON_LIMIT) {
    throw fieldRefusal('note', limitMessage(REASON_LIMIT));
  }
  return { via: 'admin', note: trimmed };
}
