import 'server-only';
import { findProvidersOfUsers, findUserCount, findUserPage } from '../../../db/repository';
import { Forbidden } from '../../../lib/errors';
import { isSiteAdmin, refuseBatch } from './admin-changes';
import { assertSiteAdmin } from './site-admin';
import type { Session } from '../../../lib/session';
import type { Cursor, PageCount, PageEntry, PageRequest } from '../../../lib/types';
import type { UserFilter, UserRow } from '../types';

// A read, so the mutation sweep does not reach it: the check is here, by direct call, and the page confers no workspace access (claude-docs/auth/admin-users.md, "The user list").

const REFUSAL = 'Only a site keeper may list users';

/**
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

function trimmedFilter(filter: UserFilter): UserFilter {
  return { ...filter, query: filter.query?.trim() || undefined };
}

/** A DataLoader's batch. A site admin's alone, their own row included: every slot of anyone else's is a `Forbidden`. */
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
