import { and, eq, gt, lt, not, or, sql } from 'drizzle-orm';
import { accounts } from '../../modules/identity/schema/auth';
import { userPrivilegeChanges } from '../../modules/identity/schema/user-privilege-changes';
import { users } from '../../modules/identity/schema/users';
import { supportRequests } from '../../modules/support/schema/support-requests';
import { supportTimeouts } from '../../modules/support/schema/support-timeouts';
// The database client; why only the repository may import it: see `select.ts`.
// oxlint-disable-next-line no-restricted-imports
import { db } from '../connection';
import { notSoftDeleted } from './predicates';
import { timeoutStands } from './support';
import { existsIn } from './select';

/** The rows a lapse can reach: unverified, holding a provider, and not vouched for by a keeper. */
function provisional(userId?: string) {
  return and(
    userId === undefined ? undefined : eq(users.id, userId),
    eq(users.emailVerified, false),
    existsIn(accounts, eq(accounts.userId, users.id)),
    not(existsIn(userPrivilegeChanges, eq(userPrivilegeChanges.userId, users.id))),
  );
}

/** How long an anonymous account that holds no request lives, counted from its creation. */
const ANONYMOUS_IDLE_DAYS = 7;

/**
 * An anonymous sender's account that has lapsed: it holds no request and no standing time-out (retention hands each one it sent to the System account
 * when it anonymises it), and is older than the idle days, so a fresh account whose first send is still being written stays.
 */
function lapsedAnonymous(userId?: string) {
  return and(
    userId === undefined ? undefined : eq(users.id, userId),
    eq(users.isAnonymous, true),
    lt(users.createdAt, sql`now() - make_interval(days => ${ANONYMOUS_IDLE_DAYS})`),
    not(existsIn(supportRequests, eq(supportRequests.createdBy, users.id))),
    // A time-out goes with its account by cascade, and binds the address it was set for, so it keeps the account.
    not(existsIn(supportTimeouts, and(eq(supportTimeouts.userId, users.id), timeoutStands))),
  );
}

/** The rows the cleanup may remove: a provisional account past either window, or a lapsed anonymous one. */
function lapsed(lifetimeSeconds: number, capSeconds: number, userId?: string) {
  return or(
    and(
      provisional(userId),
      or(
        lt(users.updatedAt, sql`now() - make_interval(secs => ${lifetimeSeconds})`),
        lt(users.createdAt, sql`now() - make_interval(secs => ${capSeconds})`),
      ),
    ),
    lapsedAnonymous(userId),
  );
}

/**
 * Hard-deletes one provisional account if it has lapsed (unverified, with a
 * provider `accounts` row, idle or older than the cap), outside `withAudit`:
 * a tombstone would block Better Auth's sign-in. A user with a privilege-ledger
 * row is kept. Returns whether the row went. (claude-docs/db/write-path.md, "Removing a lapsed provisional account")
 */
export async function deleteLapsedProvisionalUser(
  userId: string,
  lifetimeSeconds: number,
  capSeconds: number,
): Promise<boolean> {
  const rows = await db
    .delete(users)
    .where(lapsed(lifetimeSeconds, capSeconds, userId))
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
 * One page of the ids of provisional accounts that have lapsed, by the database's clock: in id
 * order after `after` (from the start when null), at most `limit`. The daily cleanup deletes each
 * through `deleteLapsedProvisionalUser`; paging by id keeps a page deleted meanwhile from moving
 * the next one.
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
        after === null ? undefined : gt(users.id, after),
        lapsed(lifetimeSeconds, capSeconds),
      ),
    )
    .orderBy(users.id)
    .limit(limit);
  return rows.map((row) => row.id);
}
