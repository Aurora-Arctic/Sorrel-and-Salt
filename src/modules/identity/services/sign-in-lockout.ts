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

export const QUIET_PERIOD = 24 * 60 * MINUTE;

export const FAILURES_PER_LOCK = 5;

/** Each lock's length in turn; every lock past the last is as long as the last, the ceiling. */
export const LOCK_LENGTHS = [MINUTE, 5 * MINUTE, 15 * MINUTE, 60 * MINUTE] as const;

export async function isPasswordSignInLocked(userId: string, now = new Date()): Promise<boolean> {
  const row = await readSignInFailure(userId);
  return row?.lockedUntil != null && row.lockedUntil > now;
}

export interface NewLock {
  length: number;
  /** Whether it opens a series: no earlier lock ended within the quiet period. Only the first of a series is mailed. */
  firstOfSeries: boolean;
}

export async function recordFailedPasswordSignIn(
  userId: string,
  now = new Date(),
): Promise<NewLock | null> {
  const quietSince = new Date(now.getTime() - QUIET_PERIOD);
  // The upsert leaves `lockedUntil`, so the row it returns still holds the previous lock.
  const { count, lockedUntil } = await recordSignInFailure(userId, now, quietSince);
  if (count % FAILURES_PER_LOCK !== 0) return null;
  const nth = count / FAILURES_PER_LOCK;
  const length = LOCK_LENGTHS[Math.min(nth, LOCK_LENGTHS.length) - 1];
  await lockPasswordSignIn(userId, new Date(now.getTime() + length));
  return { length, firstOfSeries: lockedUntil === null || lockedUntil <= quietSince };
}

export function clearFailedPasswordSignIns(userId: string): Promise<void> {
  return clearSignInFailures(userId);
}
