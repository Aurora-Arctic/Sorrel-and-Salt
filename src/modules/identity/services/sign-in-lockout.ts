import 'server-only';
import {
  clearSignInFailures,
  lockPasswordSignIn,
  readSignInFailure,
  recordSignInFailure,
} from '../../../db/repository';

// The per-account lock on password sign-in (claude-docs/auth/passwords.md, "Lockout"). Provider and passkey sign-in
// never read it. Written outside `withAudit`: a failed sign-in has no session to audit (CLAUDE.md rule 3).

const MINUTE = 60_000;

/** How long an account goes with no failure before its count starts over. */
export const QUIET_PERIOD = 24 * 60 * MINUTE;

/** Every this many failures starts a lock. */
export const FAILURES_PER_LOCK = 5;

/** Each lock's length in turn; every lock past the last is as long as the last, the ceiling. */
export const LOCK_LENGTHS = [MINUTE, 5 * MINUTE, 15 * MINUTE, 60 * MINUTE] as const;

/** Whether password sign-in is refused for this account at `now`. */
export async function isPasswordSignInLocked(userId: string, now = new Date()): Promise<boolean> {
  const row = await readSignInFailure(userId);
  return row?.lockedUntil != null && row.lockedUntil > now;
}

/**
 * Counts one wrong password, starting over after a quiet period, and starts a lock when the count reaches a multiple of
 * `FAILURES_PER_LOCK`. Returns the new lock's length in milliseconds, or null when this failure starts none.
 */
export async function recordFailedPasswordSignIn(
  userId: string,
  now = new Date(),
): Promise<number | null> {
  const { count } = await recordSignInFailure(userId, now, new Date(now.getTime() - QUIET_PERIOD));
  if (count % FAILURES_PER_LOCK !== 0) return null;
  const nth = count / FAILURES_PER_LOCK;
  const length = LOCK_LENGTHS[Math.min(nth, LOCK_LENGTHS.length) - 1];
  await lockPasswordSignIn(userId, new Date(now.getTime() + length));
  return length;
}

/** Forgets every failure, on a successful password or passkey sign-in, or a completed reset. */
export function clearFailedPasswordSignIns(userId: string): Promise<void> {
  return clearSignInFailures(userId);
}
