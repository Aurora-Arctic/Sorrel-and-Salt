import { and, eq, inArray, ne, or, sql, type SQL } from 'drizzle-orm';
import { accounts } from '../../modules/identity/schema/auth';
import { userPrivilegeChanges } from '../../modules/identity/schema/user-privilege-changes';
import { users } from '../../modules/identity/schema/users';
import type { SiteAdmin } from '@/modules/identity';
import { BOOTSTRAP_USER_ID } from '../bootstrap';
import type { Cursor, PageCount, PageEntry, PageRequest } from '../../lib/types';
import { findMany, findPage, findPageCount } from './finders';
import { containsText, notSoftDeleted } from './predicates';
import { existsIn, selectFrom } from './select';
import type { LinkedProvider, PrivilegeChangeFilter, SortPart, UserFilter } from './types';

/**
 * The live row holding this address, or `undefined`. Compared lower-cased,
 * which `users_email_lower_case` holds every row to. The third read that takes
 * no proof, for the reason the first two do: an address is claimed site-wide,
 * so there is no workspace to hold a proof for. The service calling it decides
 * what a hit means; the index's export list is pinned, so a fourth is a
 * decision.
 */
export async function findUserByEmail(
  email: string,
): Promise<(typeof users)['$inferSelect'] | undefined> {
  const [row] = await findMany(users, eq(users.email, email.toLowerCase()));
  return row;
}

/**
 * One page of the live users under `filter`, by name and then id: the admin
 * user list (MB.52). It takes the `SiteAdmin` proof, so no caller that has not
 * asserted the site role can read the list. The seed's bootstrap user is left
 * out: it stamps the seeded rows, nobody signs in as it, and nothing an admin
 * does to a person applies to it (claude-docs/auth/admin-users.md, "The user
 * list").
 */
export function findUserPage(
  _admin: SiteAdmin,
  filter: UserFilter,
  page: PageRequest,
): Promise<PageEntry<typeof users.$inferSelect>[]> {
  return findPage(
    users,
    [users.name],
    page,
    and(ne(users.id, BOOTSTRAP_USER_ID), ...userArms(filter)),
  );
}

/**
 * The provider of every account linked to these users, and nothing else of
 * the row: its tokens never leave the repository. Under the `SiteAdmin`
 * proof, for the user list; a user's own come from Better Auth, on the
 * account page.
 */
export async function findProvidersOfUsers(
  _admin: SiteAdmin,
  userIds: readonly string[],
): Promise<LinkedProvider[]> {
  if (userIds.length === 0) return [];
  // `accounts` carries no `deleted_at`, so the filter adds nothing today; it is
  // here so a later column is filtered without a second look.
  const rows = await selectFrom(
    accounts,
    and(notSoftDeleted(accounts), inArray(accounts.userId, [...userIds])),
  );
  return rows.map(({ userId, providerId }) => ({ userId, providerId }));
}

/**
 * The ledger's order, newest first: a page's key is ascending, so a
 * descending part is written negated (`types.ts`, `SortPart`), and as
 * `numeric`, which keeps the microseconds a `Date` would drop from a cursor.
 * Rows of one instant, a role grant and the flag it sets, follow by id.
 */
const LEDGER_ORDER: readonly SortPart[] = [
  { expression: sql`-extract(epoch from ${userPrivilegeChanges.createdAt})`, type: 'numeric' },
];

/**
 * One page of the privilege ledger under `filter`, newest first (MB.199):
 * `/admin/privilege-changes`. Under the `SiteAdmin` proof, as the user list
 * is, since who holds which privilege is an admin's business alone.
 */
export function findPrivilegeChangePage(
  _admin: SiteAdmin,
  filter: PrivilegeChangeFilter,
  page: PageRequest,
): Promise<PageEntry<typeof userPrivilegeChanges.$inferSelect>[]> {
  return findPage(userPrivilegeChanges, LEDGER_ORDER, page, and(...privilegeChangeArms(filter)));
}

/**
 * How many rows `findPrivilegeChangePage` pages under `filter`, and how
 * many come before `start`, a page's first row, none on an empty page: the
 * ledger page's "Page X of Y" (MB.200).
 */
export function findPrivilegeChangeCount(
  _admin: SiteAdmin,
  filter: PrivilegeChangeFilter,
  start: Cursor | undefined,
): Promise<PageCount> {
  return findPageCount(
    userPrivilegeChanges,
    LEDGER_ORDER,
    start,
    and(...privilegeChangeArms(filter)),
  );
}

/** The ledger filter's arms, each `undefined` when its part is absent. */
function privilegeChangeArms({
  userId,
  privilege,
  query,
}: PrivilegeChangeFilter): (SQL | undefined)[] {
  return [
    userId ? eq(userPrivilegeChanges.userId, userId) : undefined,
    privilege ? eq(userPrivilegeChanges.privilege, privilege) : undefined,
    // The subject's live row, matched as the user list matches one, in SQL:
    // a semi-join, so a row is never fetched to be filtered out.
    query
      ? existsIn(users, and(eq(users.id, userPrivilegeChanges.userId), nameOrEmailHolds(query)))
      : undefined,
  ];
}

/** The filter's arms, each `undefined` when its part is absent. */
function userArms({ query, awaitingApproval, role }: UserFilter): (SQL | undefined)[] {
  return [
    query ? nameOrEmailHolds(query) : undefined,
    awaitingApproval ? eq(users.canCreateWorkspace, false) : undefined,
    role ? eq(users.role, role) : undefined,
  ];
}

/** A user's name or address holds `query`: the user list's match, and the ledger's by subject. */
function nameOrEmailHolds(query: string): SQL | undefined {
  return or(containsText(users.name, query), containsText(users.email, query));
}
