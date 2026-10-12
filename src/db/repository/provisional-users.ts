import { and, eq, lt, not, or, sql } from 'drizzle-orm';
import { accounts } from '../../modules/identity/schema/auth';
import { userPrivilegeChanges } from '../../modules/identity/schema/user-privilege-changes';
import { users } from '../../modules/identity/schema/users';
// The choke point the rule exists to protect — enforced by lint as of M1.17.
// oxlint-disable-next-line no-restricted-imports
import { db } from '../connection';
import { existsIn } from './select';

/**
 * Hard-deletes every provisional account: unverified, holding a provider
 * `accounts` row, and either untouched for `lifetimeSeconds` or created more
 * than `capSeconds` ago, both by the database's own clock, so a seeded row nobody can sign in to is never one. Its
 * `accounts` and `sessions` rows go with it by `ON DELETE CASCADE`.
 *
 * An account holding a `user_privilege_changes` row is kept, since an admin
 * has vouched for it. Not deleted with its rows: the ledger refuses the
 * delete, and its plain foreign key would fail the whole statement, and so
 * every later sweep (MB.204; claude-docs/db/provisional-account-delete.md).
 *
 * Hard rather than soft, and outside `withAudit`: Better Auth finds a user by
 * address without our `deleted_at` filter, so a tombstone would go on
 * blocking the owner's sign-in, and there is no session to stamp one with
 * (claude-docs/auth/admin-bootstrap.md, "Provisional accounts"). The one users delete, pinned
 * by `soft-delete-finder-guard.test.ts`'s export list.
 */
export async function deleteProvisionalUsers(
  lifetimeSeconds: number,
  capSeconds: number,
): Promise<string[]> {
  const rows = await db
    .delete(users)
    .where(
      and(
        eq(users.emailVerified, false),
        or(
          lt(users.updatedAt, sql`now() - make_interval(secs => ${lifetimeSeconds})`),
          lt(users.createdAt, sql`now() - make_interval(secs => ${capSeconds})`),
        ),
        existsIn(accounts, eq(accounts.userId, users.id)),
        not(existsIn(userPrivilegeChanges, eq(userPrivilegeChanges.userId, users.id))),
      ),
    )
    .returning({ id: users.id });
  return rows.map((row) => row.id);
}
