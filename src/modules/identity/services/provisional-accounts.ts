import 'server-only';
import { deleteProvisionalUsers } from '../../../db/repository';

// An unverified account is provisional: it lapses one verification lifetime
// after its last mail, and three hours after sign-up whatever it resends, so
// it cannot hold an address against its owner for long
// (claude-docs/auth/admin-bootstrap.md, "Provisional accounts").

/** The verification link's lifetime, and so the provisional window. */
export const VERIFICATION_LIFETIME_SECONDS = 3600;

/**
 * The most an unverified account lives, counted from sign-up. Without it, a
 * squatter resending from their own session every hour keeps the address.
 */
export const PROVISIONAL_CAP_SECONDS = 3 * 3600;

/** Removes every lapsed account, with its provider links and sessions. Returns their ids. */
export function sweepProvisionalAccounts(): Promise<string[]> {
  return deleteProvisionalUsers(VERIFICATION_LIFETIME_SECONDS, PROVISIONAL_CAP_SECONDS);
}
