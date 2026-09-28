import { and, eq, lt, or, sql } from 'drizzle-orm';
import { accounts } from '../../modules/identity/schema/auth';
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
 * Hard rather than soft, and outside `withAudit`: Better Auth finds a user by
 * address without our `deleted_at` filter, so a tombstone would go on
 * blocking the owner's sign-in, and there is no session to stamp one with
 * (claude-docs/auth.md, "Provisional accounts"). The one users delete, pinned
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
      ),
    )
    .returning({ id: users.id });
  return rows.map((row) => row.id);
}
