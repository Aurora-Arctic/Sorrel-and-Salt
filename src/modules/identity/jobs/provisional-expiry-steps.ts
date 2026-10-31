'use step';

import {
  VERIFICATION_LIFETIME_SECONDS,
  expireProvisionalAccount,
} from '../services/provisional-accounts';

// The steps of the provisional-expiry job. A file of its own, so the workflow bundle keeps only
// the calls to them and never the database code they reach.

/** How long a run waits before its first look at the account. */
export async function firstLookDelay(): Promise<number> {
  return VERIFICATION_LIFETIME_SECONDS;
}

/** Deletes the account if its window has lapsed; otherwise the seconds left, or null when nothing is left to wait for. */
export async function expireStep(userId: string): Promise<number | null> {
  return expireProvisionalAccount(userId);
}
