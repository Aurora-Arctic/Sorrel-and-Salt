import { eq, gt, sql } from 'drizzle-orm';
import { signInFailures } from '../../modules/identity/schema/auth';
// The database client; why only the repository may import it: see `select.ts`.
// oxlint-disable-next-line no-restricted-imports
import { db } from '../connection';

export type SignInFailureRow = typeof signInFailures.$inferSelect;

// Not `find…`: the soft-delete guard holds every `find` export to a tombstone filter, and this table has no tombstone.
/** The account's failed-sign-in row, or null while it has none. */
export async function readSignInFailure(userId: string): Promise<SignInFailureRow | null> {
  const [row] = await db.select().from(signInFailures).where(eq(signInFailures.userId, userId));
  return row ?? null;
}

/**
 * Adds one failure at `now` in a single statement, so two failures racing each other both count. The row starts at
 * one when it is new, and starts over at one when its last failure came before `quietSince`. Outside `withAudit`: a
 * failed sign-in has no session to audit.
 */
export async function recordSignInFailure(
  userId: string,
  now: Date,
  quietSince: Date,
): Promise<SignInFailureRow> {
  const recent = gt(signInFailures.lastFailedAt, quietSince);
  const [row] = await db
    .insert(signInFailures)
    .values({ userId, count: 1, firstFailedAt: now, lastFailedAt: now })
    .onConflictDoUpdate({
      target: signInFailures.userId,
      set: {
        count: sql`case when ${recent} then ${signInFailures.count} + 1 else 1 end`,
        firstFailedAt: sql`case when ${recent} then ${signInFailures.firstFailedAt} else excluded.first_failed_at end`,
        lastFailedAt: now,
      },
    })
    .returning();
  return row;
}

/** Sets the end of the account's lock, leaving the count. */
export async function lockPasswordSignIn(userId: string, lockedUntil: Date): Promise<void> {
  await db.update(signInFailures).set({ lockedUntil }).where(eq(signInFailures.userId, userId));
}

/** Removes the row, on a successful sign-in or a reset. */
export async function clearSignInFailures(userId: string): Promise<void> {
  await db.delete(signInFailures).where(eq(signInFailures.userId, userId));
}
