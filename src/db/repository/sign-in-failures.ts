import { eq, sql } from 'drizzle-orm';
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
 * Adds one failure in a single statement, creating the row at one, so two failures racing each other both count. Outside `withAudit`: a
 * failed sign-in has no session to audit.
 */
export async function recordSignInFailure(userId: string): Promise<SignInFailureRow> {
  const [row] = await db
    .insert(signInFailures)
    .values({ userId, count: 1 })
    .onConflictDoUpdate({
      target: signInFailures.userId,
      set: { count: sql`${signInFailures.count} + 1` },
    })
    .returning();
  return row;
}

/** Sets the end of a timed lock or the stop only a reset lifts, leaving the count; a field left out keeps its value. */
export async function lockPasswordSignIn(
  userId: string,
  lock: { lockedUntil?: Date; passwordDisabled?: boolean },
): Promise<void> {
  await db.update(signInFailures).set(lock).where(eq(signInFailures.userId, userId));
}

/** Removes the row, on a successful sign-in or a reset. */
export async function clearSignInFailures(userId: string): Promise<void> {
  await db.delete(signInFailures).where(eq(signInFailures.userId, userId));
}
