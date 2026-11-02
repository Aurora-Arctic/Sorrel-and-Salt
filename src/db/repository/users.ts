import { and, eq, inArray, ne, or, sql, type SQL } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { workspaceMembers, workspaces } from '../../modules/coven/schema/workspaces';
import { accounts } from '../../modules/identity/schema/auth';
import { userPrivilegeChanges } from '../../modules/identity/schema/user-privilege-changes';
import { users } from '../../modules/identity/schema/users';
import type { SiteAdmin } from '@/modules/identity';
import { SIGNED_OUT_SENDER_ID } from '../../lib/support-sender';
import { SYSTEM_ACTOR_ID } from '../../lib/system-actor';
import { BOOTSTRAP_USER_ID } from '../bootstrap';
import type { Cursor, PageCount, PageEntry, PageRequest } from '../../lib/types';
import { findMany, findPage, findPageCount } from './finders';
import { containsText, notSoftDeleted } from './predicates';
import { existsIn, selectFrom } from './select';
import type {
  LinkedProvider,
  PrivilegeChangeFilter,
  SortPart,
  UserFilter,
  UserName,
} from './types';

/**
 * The live row holding this address, or `undefined`, compared lower-cased as `users_email_lower_case` holds. The third read
 * that takes no proof, as an address is claimed site-wide; the index's export list is pinned, so a fourth is a decision.
 */
export async function findUserByEmail(
  email: string,
): Promise<(typeof users)['$inferSelect'] | undefined> {
  const [row] = await findMany(users, eq(users.email, email.toLowerCase()));
  return row;
}

/** The user list's order, by name and then id. */
const USER_ORDER: readonly SortPart[] = [users.name];

/** The users the list holds under `filter`: all but the three system users, narrowed by its arms. */
function listedUsers(filter: UserFilter): SQL | undefined {
  return and(
    ne(users.id, BOOTSTRAP_USER_ID),
    ne(users.id, SIGNED_OUT_SENDER_ID),
    ne(users.id, SYSTEM_ACTOR_ID),
    ...userArms(filter),
  );
}

/**
 * One page of the live users under `filter`, by name then id, for the admin user list, under the `SiteAdmin` proof. The seed's
 * bootstrap user, the signed-out support sender and the job actor are left out: nobody signs in as it and nothing an admin does to a person applies to it
 * (claude-docs/auth/admin-users.md, "The user list").
 */
export function findUserPage(
  _admin: SiteAdmin,
  filter: UserFilter,
  page: PageRequest,
): Promise<PageEntry<typeof users.$inferSelect>[]> {
  return findPage(users, USER_ORDER, page, listedUsers(filter));
}

/**
 * How many users `findUserPage` pages under `filter`, and how many come
 * before `start`, a page's first row, none on an empty page: the user list's
 * "Page X of Y".
 */
export function findUserCount(
  _admin: SiteAdmin,
  filter: UserFilter,
  start: Cursor | undefined,
): Promise<PageCount> {
  return findPageCount(users, USER_ORDER, start, listedUsers(filter));
}

/**
 * The provider of every account linked to these users and nothing else of the row: tokens never leave the repository. Under
 * the `SiteAdmin` proof, for the user list; a user's own come from Better Auth.
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
 * The display name of each given user who holds or has held a seat in a coven
 * `viewerId` sits in now, and nothing else of the row. A proofless read: the
 * viewer's own live seat is the scope. Skips the soft-delete filter on the user. (claude-docs/db/write-path.md, "Reads that take no proof")
 */
export async function findCoMemberNamesIncludingSoftDeleted(
  viewerId: string,
  userIds: readonly string[],
): Promise<UserName[]> {
  if (userIds.length === 0) return [];
  const viewerSeat = alias(workspaceMembers, 'viewer_seat');
  const seats = await selectFrom(
    workspaceMembers,
    and(
      inArray(workspaceMembers.userId, [...userIds]),
      existsIn(
        viewerSeat,
        and(
          eq(viewerSeat.workspaceId, workspaceMembers.workspaceId),
          eq(viewerSeat.userId, viewerId),
        ),
      ),
      existsIn(workspaces, eq(workspaces.id, workspaceMembers.workspaceId)),
    ),
    { leftJoin: users, on: eq(users.id, workspaceMembers.userId) },
  );
  // `workspace_members.user_id` references `users.id`, so every seat joins a
  // row; the guard narrows the type rather than filtering anything.
  const names = new Map(seats.flatMap(({ joined }) => (joined ? [[joined.id, joined.name]] : [])));
  return [...names].map(([id, name]) => ({ id, name }));
}

/**
 * The ledger's order, newest first: the key is ascending, so the descending part is negated (`types.ts`, `SortPart`), as
 * `numeric` to keep a `Date`'s dropped microseconds. Rows of one instant (a role grant and its flag) follow by id.
 */
const LEDGER_ORDER: readonly SortPart[] = [
  { expression: sql`-extract(epoch from ${userPrivilegeChanges.createdAt})`, type: 'numeric' },
];

/**
 * One page of the privilege ledger under `filter`, newest first:
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
 * ledger page's "Page X of Y".
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
