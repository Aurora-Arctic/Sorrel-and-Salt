import 'server-only';
import {
  deleteLapsedProvisionalUser,
  findLapsedProvisionalUserIds,
  provisionalSecondsLeft,
} from '../../../db/repository';
import { CLEANUP_PAGE_SIZE } from '../jobs/provisional-cleanup-pages';

// An unverified account is provisional: it lapses one verification lifetime
// after its last mail, and three hours after sign-up whatever it resends, so
// it cannot hold an address against its owner for long
// (claude-docs/auth/admin-bootstrap.md, "Provisional accounts"). One job per
// sign-up does the removing (src/modules/identity/jobs/provisional-expiry.ts), and
// a daily cleanup removes any its run missed (src/modules/identity/jobs/provisional-cleanup.ts).

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

/**
 * One page of the ids of provisional accounts whose window has lapsed, in id order after `after`
 * (from the start when null), at most `CLEANUP_PAGE_SIZE`. The daily cleanup reads them a page at a
 * time and deletes each page in a batch run.
 */
export async function findLapsedProvisionalPage(after: string | null): Promise<string[]> {
  return findLapsedProvisionalUserIds(
    VERIFICATION_LIFETIME_SECONDS,
    PROVISIONAL_CAP_SECONDS,
    after,
    CLEANUP_PAGE_SIZE,
  );
}

/**
 * Removes each of `ids` that has still lapsed, through the same single-row delete the per-sign-up
 * job uses, so an account verified since the page was read stays, and one already gone is skipped.
 * One the database refuses to delete is logged and left, so it cannot stop the rest of the page.
 * Returns how many went: a re-run or an overlapping run deletes nothing twice and raises no error.
 */
export async function deleteLapsedProvisionalAccounts(ids: readonly string[]): Promise<number> {
  let removed = 0;
  for (const id of ids) {
    try {
      if (
        await deleteLapsedProvisionalUser(
          id,
          VERIFICATION_LIFETIME_SECONDS,
          PROVISIONAL_CAP_SECONDS,
        )
      ) {
        removed += 1;
      }
    } catch (error) {
      // A row other tables still point at, such as a support request it wrote, is refused by the database; it is left, and the rest of the page still goes.
      // oxlint-disable-next-line no-console -- the log is how a held account is seen
      console.error(`Could not delete the lapsed provisional account ${id}`, error);
    }
  }
  return removed;
}
