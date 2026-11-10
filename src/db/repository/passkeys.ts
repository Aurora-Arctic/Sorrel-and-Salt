import { and, eq, inArray, isNotNull, or } from 'drizzle-orm';
import { accounts, passkeys } from '../../modules/identity/schema/auth';
import { users } from '../../modules/identity/schema/users';
// The database client; why only the repository may import it: see `select.ts`.
// oxlint-disable-next-line no-restricted-imports
import { db } from '../connection';

/** What became of a request to remove a passkey: removed, refused as the last way in, or not the account's own. */
export type PasskeyRemoval = 'removed' | 'last-way-in' | 'not-held';

/**
 * Removes the passkey unless it is the account's last way to sign in; outside `withAudit` (no audit columns),
 * and the account row stays locked so racing removals run in turn (claude-docs/db/write-path.md, "Removing a
 * passkey").
 */
export async function removePasskeyKeepingAWayIn(
  userId: string,
  passkeyId: string,
  providerIds: readonly string[],
): Promise<PasskeyRemoval> {
  return db.transaction(async (tx) => {
    // `no key update` serialises removals for one account without blocking rows that reference it.
    await tx.select({ id: users.id }).from(users).where(eq(users.id, userId)).for('no key update');
    const held = await tx
      .select({ id: passkeys.id })
      .from(passkeys)
      .where(eq(passkeys.userId, userId));
    if (!held.some((row) => row.id === passkeyId)) return 'not-held';
    if (held.length === 1) {
      const [another] = await tx
        .select({ id: accounts.id })
        .from(accounts)
        .where(
          and(
            eq(accounts.userId, userId),
            or(
              inArray(accounts.providerId, [...providerIds]),
              and(eq(accounts.providerId, 'credential'), isNotNull(accounts.password)),
            ),
          ),
        )
        .limit(1);
      if (!another) return 'last-way-in';
    }
    await tx.delete(passkeys).where(and(eq(passkeys.id, passkeyId), eq(passkeys.userId, userId)));
    return 'removed';
  });
}
