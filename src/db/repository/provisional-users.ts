import { and, eq, gt, lt, not, or, sql } from 'drizzle-orm';
import { accounts } from '../../modules/identity/schema/auth';
import { userPrivilegeChanges } from '../../modules/identity/schema/user-privilege-changes';
import { users } from '../../modules/identity/schema/users';
// The database client; why only the repository may import it: see `select.ts`.
// oxlint-disable-next-line no-restricted-imports
import { db } from '../connection';
import { notSoftDeleted } from './predicates';
import { existsByKey } from './select';

/** The rows a lapse can reach: unverified, holding a provider, and not vouched for by a keeper. */
function provisional(userId?: string) {
  return and(
    userId === undefined ? undefined : eq(users.id, userId),
    eq(users.emailVerified, false),
    existsByKey(accounts, accounts.userId, users.id),
    not(existsByKey(userPrivilegeChanges, userPrivilegeChanges.userId, users.id)),
  );
}

/** Idle past the lifetime, or older than the cap whatever its activity. */
function lapsed(lifetimeSeconds: number, capSeconds: number) {
  return or(
    lt(users.updatedAt, sql`now() - make_interval(secs => ${lifetimeSeconds})`),
    lt(users.createdAt, sql`now() - make_interval(secs => ${capSeconds})`),
  );
}

/**
 * Hard-deletes a lapsed provisional account outside `withAudit`; a tombstone would block Better Auth's
 * sign-in (claude-docs/db/write-path.md, "Removing a lapsed provisional account").
 */
export async function deleteLapsedProvisionalUser(
  userId: string,
  lifetimeSeconds: number,
  capSeconds: number,
): Promise<boolean> {
  const rows = await db
    .delete(users)
    .where(and(provisional(userId), lapsed(lifetimeSeconds, capSeconds)))
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
 * One page of lapsed provisional account ids by the database's clock, in id order after `after`; the daily
 * cleanup deletes each (claude-docs/db/write-path.md, "Removing a lapsed provisional account").
 */
export async function findLapsedProvisionalUserIds(
  lifetimeSeconds: number,
  capSeconds: number,
  after: string | null,
  limit: number,
): Promise<string[]> {
  const rows = await db
    .select({ id: users.id })
    .from(users)
    .where(
      and(
        notSoftDeleted(users),
        provisional(),
        after === null ? undefined : gt(users.id, after),
        lapsed(lifetimeSeconds, capSeconds),
      ),
    )
    .orderBy(users.id)
    .limit(limit);
  return rows.map((row) => row.id);
}
