import 'server-only';
import {
  deleteLapsedProvisionalUser,
  findLapsedProvisionalUserIds,
  provisionalSecondsLeft,
} from '../../../db/repository';

// An unverified account is provisional: it lapses one verification lifetime
// after its last mail, and three hours after sign-up whatever it resends, so
// it cannot hold an address against its owner for long
// (claude-docs/auth/admin-bootstrap.md, "Provisional accounts"). One job per
// sign-up does the removing (src/modules/identity/jobs/provisional-expiry.ts).

/** The verification link's lifetime, and so the provisional window. */
export const VERIFICATION_LIFETIME_SECONDS = 3600;

/**
 * The most an unverified account lives, counted from sign-up. Without it, a
 * squatter resending from their own session every hour keeps the address.
 */
export const PROVISIONAL_CAP_SECONDS = 3 * 3600;

/**
 * Removes the account if it has lapsed, with its provider links and sessions,
 * and does nothing if it is verified, vouched for, gone or still inside its
 * window. Returns the seconds until it could lapse, or `null` when there is
 * nothing left to wait for, so a re-run after success changes nothing.
 */
export async function expireProvisionalAccount(userId: string): Promise<number | null> {
  await deleteLapsedProvisionalUser(userId, VERIFICATION_LIFETIME_SECONDS, PROVISIONAL_CAP_SECONDS);
  return provisionalSecondsLeft(userId, VERIFICATION_LIFETIME_SECONDS, PROVISIONAL_CAP_SECONDS);
}

/** The most accounts one daily cleanup removes; a backlog past it is cleared by the next day's run. */
export const CLEANUP_BATCH_SIZE = 500;

/**
 * Removes every provisional account whose window has lapsed, each through the same single-row
 * delete the per-sign-up job uses. Returns how many went, so a re-run after success removes none.
 */
export async function sweepLapsedProvisionalAccounts(): Promise<number> {
  const ids = await findLapsedProvisionalUserIds(
    VERIFICATION_LIFETIME_SECONDS,
    PROVISIONAL_CAP_SECONDS,
    CLEANUP_BATCH_SIZE,
  );
  let removed = 0;
  for (const id of ids) {
    if (
      await deleteLapsedProvisionalUser(id, VERIFICATION_LIFETIME_SECONDS, PROVISIONAL_CAP_SECONDS)
    ) {
      removed += 1;
    }
  }
  return removed;
}
