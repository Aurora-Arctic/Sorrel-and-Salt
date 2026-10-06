import 'server-only';
import { findProvidersOfUsers, findUserPage } from '../../../db/repository';
import { Forbidden } from '../../../lib/errors';
import { assertSiteAdmin } from './site-admin';
import type { Session } from '../../../lib/session';
import type { PageEntry, PageRequest } from '../../../lib/types';
import type { UserFilter, UserRow } from '../types';

// The admin user list's two reads (MB.52). A read, so M5.7's mutation sweep
// does not reach it: the check is here, by direct call, and the page confers
// no workspace access (claude-docs/auth/admin-users.md, "The user list").

const REFUSAL = 'Only a site admin may list users';

/**
 * One page of the live users under `filter`, to a site admin. A blank query
 * is no query.
 *
 * @throws {Forbidden} the session's role is not `admin`.
 */
export async function listUsers(
  session: Session,
  { query, awaitingApproval }: UserFilter,
  page: PageRequest,
): Promise<PageEntry<UserRow>[]> {
  const admin = assertSiteAdmin(session, REFUSAL);
  const trimmed = query?.trim();
  return findUserPage(admin, { query: trimmed || undefined, awaitingApproval }, page);
}

/**
 * The providers linked to each user named, sorted, one answer per id in the
 * order given: a DataLoader's batch, and the page's. A site admin's alone, a
 * user's own row included: every slot of anyone else's batch is a `Forbidden`.
 * One query whatever the batch size.
 */
export async function providersOf(
  session: Session,
  userIds: readonly string[],
): Promise<(string[] | Forbidden)[]> {
  if (session.role !== 'admin') return userIds.map(() => new Forbidden(REFUSAL));
  const linked = await findProvidersOfUsers(assertSiteAdmin(session, REFUSAL), [
    ...new Set(userIds),
  ]);
  return userIds.map((id) =>
    linked
      .filter((row) => row.userId === id)
      .map((row) => row.providerId)
      .sort(),
  );
}
