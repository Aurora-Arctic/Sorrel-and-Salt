import 'server-only';
import { findProvidersOfUsers, findUserCount, findUserPage } from '../../../db/repository';
import { Forbidden } from '../../../lib/errors';
import { isSiteAdmin, refuseBatch } from './admin-changes';
import { assertSiteAdmin } from './site-admin';
import type { Session } from '../../../lib/session';
import type { Cursor, PageCount, PageEntry, PageRequest } from '../../../lib/types';
import type { UserFilter, UserRow } from '../types';

// The admin user list's reads, and its count. A read, so M5.7's mutation sweep
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
  filter: UserFilter,
  page: PageRequest,
): Promise<PageEntry<UserRow>[]> {
  const admin = assertSiteAdmin(session, REFUSAL);
  return findUserPage(admin, trimmedFilter(filter), page);
}

/**
 * How many users `listUsers` pages under `filter`, and how many come before
 * `start`, a page's first row, none on an empty page: the user list's
 * "Page X of Y".
 *
 * @throws {Forbidden} the session's role is not `admin`.
 */
export async function countUsers(
  session: Session,
  filter: UserFilter,
  start: Cursor | undefined,
): Promise<PageCount> {
  const admin = assertSiteAdmin(session, REFUSAL);
  return findUserCount(admin, trimmedFilter(filter), start);
}

/** The filter as the repository takes it, a blank query no query. */
function trimmedFilter({ query, awaitingApproval, role }: UserFilter): UserFilter {
  return { query: query?.trim() || undefined, awaitingApproval, role };
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
  if (!isSiteAdmin(session)) return refuseBatch(userIds, REFUSAL);
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
