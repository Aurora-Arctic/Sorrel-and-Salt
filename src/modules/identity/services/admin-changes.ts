import 'server-only';
import { findOneById } from '../../../db/repository';
import type { PrivilegeDeclaration } from '../../../db/repository';
import { Forbidden, NotFound } from '../../../lib/errors';
import { parsePauseNote } from '../../../lib/pause-message';
import type { Session } from '../../../lib/session';
import { users } from '../schema/users';
import type { UserRow } from '../types';

/** For a caller answering a batch that refuses slot by slot; otherwise use `assertSiteAdmin`. */
export function isSiteAdmin(session: Session): boolean {
  return session.role === 'admin';
}

export function refuseBatch(ids: readonly string[], reason: string): Forbidden[] {
  return ids.map(() => new Forbidden(reason));
}

/** What a lookup of a user that is gone says. */
export const NO_SUCH_USER = 'No such user';

/**
 * @throws {NotFound} no live user has this id.
 */
export async function liveUser(userId: string): Promise<UserRow> {
  const user = await findOneById(users, userId);
  if (!user) throw new NotFound(NO_SUCH_USER);
  return user;
}

/**
 * A keeper's change as the privilege trigger records it: `via: 'admin'`, with the confirmation's optional `note`, trimmed, blank as none.
 * @throws {ValidationError} on `['note']` when the trimmed note is over 500 characters.
 */
export function adminDeclaration(note: string | undefined): PrivilegeDeclaration {
  return { via: 'admin', note: parsePauseNote(note, { required: false }) ?? undefined };
}
