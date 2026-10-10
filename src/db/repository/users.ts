import { and, eq, inArray, ne, or, type SQL } from 'drizzle-orm';
import { accounts } from '../../modules/identity/schema/auth';
import { users } from '../../modules/identity/schema/users';
import type { SiteAdmin } from '@/modules/identity';
import { BOOTSTRAP_USER_ID } from '../bootstrap';
import type { PageEntry, PageRequest } from '../../lib/types';
import { findMany } from './finders';
import { containsText, notSoftDeleted } from './predicates';
import { pageBounds, selectFrom } from './select';
import type { LinkedProvider, UserFilter } from './types';

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
  const keyset = { sort: [users.name], id: users.id, request: page };
  return selectFrom(
    users,
    and(
      notSoftDeleted(users),
      ne(users.id, BOOTSTRAP_USER_ID),
      ...userArms(filter),
      pageBounds(keyset),
    ),
    keyset,
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

/** The filter's arms, each `undefined` when its part is absent. */
function userArms({ query, awaitingApproval, role }: UserFilter): (SQL | undefined)[] {
  return [
    query ? or(containsText(users.name, query), containsText(users.email, query)) : undefined,
    awaitingApproval ? eq(users.canCreateWorkspace, false) : undefined,
    role ? eq(users.role, role) : undefined,
  ];
}
