import { and, eq, lt, not, or, sql } from 'drizzle-orm';
import { accounts } from '../../modules/identity/schema/auth';
import { userPrivilegeChanges } from '../../modules/identity/schema/user-privilege-changes';
import { users } from '../../modules/identity/schema/users';
// The database client; why only the repository may import it: see `select.ts`.
// oxlint-disable-next-line no-restricted-imports
import { db } from '../connection';
import { notSoftDeleted } from './predicates';
import { existsIn } from './select';

/** The rows a lapse can reach: unverified, holding a provider, and not vouched for by an admin. */
function provisional(userId?: string) {
  return and(
    userId === undefined ? undefined : eq(users.id, userId),
    eq(users.emailVerified, false),
    existsIn(accounts, eq(accounts.userId, users.id)),
    not(existsIn(userPrivilegeChanges, eq(userPrivilegeChanges.userId, users.id))),
  );
}

/**
 * Hard-deletes one provisional account if it has lapsed (unverified, with a
 * provider `accounts` row, idle or older than the cap), outside `withAudit`:
 * a tombstone would block Better Auth's sign-in. A user with a privilege-ledger
 * row is kept. Returns whether the row went. (claude-docs/db/write-path.md, "Sweeping provisional accounts")
 */
export async function deleteLapsedProvisionalUser(
  userId: string,
  lifetimeSeconds: number,
  capSeconds: number,
): Promise<boolean> {
  const rows = await db
    .delete(users)
    .where(
      and(
        provisional(userId),
        or(
          lt(users.updatedAt, sql`now() - make_interval(secs => ${lifetimeSeconds})`),
          lt(users.createdAt, sql`now() - make_interval(secs => ${capSeconds})`),
        ),
      ),
    )
    .returning({ id: users.id });
  return rows.length > 0;
}

/**
 * Whole seconds until a provisional account lapses: the sooner of its idle
 * lifetime and its cap, by the database's clock. `null` when the row is gone,
 * verified, vouched for or already past either, so nothing is left to wait for.
 */
export async function provisionalSecondsLeft(
  userId: string,
  lifetimeSeconds: number,
  capSeconds: number,
): Promise<number | null> {
  const [row] = await db
    .select({
      left: sql<number>`ceil(extract(epoch from least(
        ${users.updatedAt} + make_interval(secs => ${lifetimeSeconds}),
        ${users.createdAt} + make_interval(secs => ${capSeconds})
      ) - now()))::int`,
    })
    .from(users)
    .where(provisional(userId));
  return row && row.left > 0 ? row.left : null;
}

/**
 * The ids of provisional accounts that have lapsed, oldest first, at most `limit`, by the
 * database's clock. The daily cleanup deletes each through `deleteLapsedProvisionalUser`.
 */
export async function findLapsedProvisionalUserIds(
  lifetimeSeconds: number,
  capSeconds: number,
  limit: number,
): Promise<string[]> {
  const rows = await db
    .select({ id: users.id })
    .from(users)
    .where(
      and(
        notSoftDeleted(users),
        provisional(),
        or(
          lt(users.updatedAt, sql`now() - make_interval(secs => ${lifetimeSeconds})`),
          lt(users.createdAt, sql`now() - make_interval(secs => ${capSeconds})`),
        ),
      ),
    )
    .orderBy(users.createdAt)
    .limit(limit);
  return rows.map((row) => row.id);
}
