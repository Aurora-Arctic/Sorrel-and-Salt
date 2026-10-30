import 'server-only';
import {
  clearSignInFailures,
  lockPasswordSignIn,
  readSignInFailure,
  recordSignInFailure,
} from '../../../db/repository';

// The per-account lock on password sign-in (claude-docs/auth/passwords.md, "Lockout"). Provider sign-in never
// reads it. Written outside `withAudit`: a failed sign-in has no session to audit (CLAUDE.md rule 3).

const MINUTE = 60_000;

/** Each count that starts a timed lock, with its length; a count between two of them adds no lock. */
const TIMED_LOCKS = [
  { from: 20, length: 60 * MINUTE },
  { from: 10, length: 5 * MINUTE },
  { from: 5, length: MINUTE },
] as const;

/** The count at which only a reset lifts the lock. */
export const PASSWORD_DISABLED_AT = 100;

/** Whether password sign-in is refused for this account at `now`. */
export async function isPasswordSignInLocked(userId: string, now = new Date()): Promise<boolean> {
  const row = await readSignInFailure(userId);
  if (!row) return false;
  return row.passwordDisabled || (row.lockedUntil !== null && row.lockedUntil > now);
}

/** Counts one wrong password and starts the lock the new count reaches, if any. */
export async function recordFailedPasswordSignIn(userId: string, now = new Date()): Promise<void> {
  const { count } = await recordSignInFailure(userId);
  if (count >= PASSWORD_DISABLED_AT) {
    await lockPasswordSignIn(userId, { passwordDisabled: true });
    return;
  }
  const lock = TIMED_LOCKS.find(({ from }) => count === from);
  if (lock)
    await lockPasswordSignIn(userId, { lockedUntil: new Date(now.getTime() + lock.length) });
}

/** Forgets every failure, on a successful password sign-in or a completed reset. */
export function clearFailedPasswordSignIns(userId: string): Promise<void> {
  return clearSignInFailures(userId);
}
