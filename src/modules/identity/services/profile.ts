import 'server-only';
import { cache } from 'react';
import { findOneById } from '../../../db/repository';
import { NotFound } from '../../../lib/errors';
import type { Session } from '../../../lib/session';
import { users } from '../schema/users';
import type { UserRow } from '../types';

// Keyed by the id rather than the session, which `cache()` compares by
// identity: a layout and a page asking cost one query per render.
const userById = cache((id: string) => findOneById(users, id));

/**
 * The signed-in user's own row. It takes no id, so there is no other user a
 * caller could name; `User`'s private fields are scoped again in the schema
 * as the second check (claude-docs/graphql.md, "Auth scopes").
 *
 * @throws {NotFound} the row is gone or soft-deleted — Better Auth reads the
 * session's user without our filter, so a session can outlive its row.
 */
export async function getMe(session: Session): Promise<UserRow> {
  const row = await userById(session.userId);
  if (!row) throw new NotFound();
  return row;
}
