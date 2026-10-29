import { and, eq, lt, not, or, sql } from 'drizzle-orm';
import { accounts } from '../../modules/identity/schema/auth';
import { userPrivilegeChanges } from '../../modules/identity/schema/user-privilege-changes';
import { users } from '../../modules/identity/schema/users';
// The database client; why only the repository may import it: see `select.ts`.
// oxlint-disable-next-line no-restricted-imports
import { db } from '../connection';
import { existsIn } from './select';

/**
 * Hard-deletes every provisional account (unverified, with a provider
 * `accounts` row, idle or older than the cap), outside `withAudit`: a tombstone
 * would block Better Auth's sign-in. A user with a privilege-ledger row is kept. (claude-docs/db/write-path.md, "Sweeping provisional accounts")
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
