import 'server-only';
import { deleteProvisionalUsers, withAudit } from '../../../db/repository';
import { users } from '../schema/users';
import type { AuditSession } from '../../../db/audit';

// An unverified account is provisional: it lapses one verification lifetime
// after its last mail, and three hours after sign-up whatever it resends, so
// it cannot hold an address against its owner for long
// (claude-docs/auth.md, "Provisional accounts").

/** The verification link's lifetime, and so the provisional window. */
export const VERIFICATION_LIFETIME_SECONDS = 3600;

/**
 * The most an unverified account lives, counted from sign-up. Without it, a
 * squatter resending from their own session every hour keeps the address.
 */
export const PROVISIONAL_CAP_SECONDS = 3 * 3600;

/**
 * Restarts the window before a resend is mailed, so the new link does not
 * outlive the account, except in the cap's last hour, where the cap wins.
 * `session` is the row's own: a resend from
 * no session mails the address but extends nothing, or anyone could keep a
 * squat alive by posting its address.
 */
export async function extendVerificationWindow(session: AuditSession): Promise<void> {
  await withAudit(session, (write) => write.updateById(users, session.userId, {}));
}

/** Removes every lapsed account, with its provider links and sessions. Returns their ids. */
export function sweepProvisionalAccounts(): Promise<string[]> {
  return deleteProvisionalUsers(VERIFICATION_LIFETIME_SECONDS, PROVISIONAL_CAP_SECONDS);
}
