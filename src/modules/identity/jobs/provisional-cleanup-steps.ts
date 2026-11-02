'use step';

import { sweepLapsedProvisionalAccounts } from '../services/provisional-accounts';

// The step of the daily provisional-cleanup job. A file of its own, so the workflow bundle keeps
// only the call to it and never the database code it reaches.

/** Deletes every provisional account whose window has lapsed; the count removed. */
export async function sweepStep(): Promise<number> {
  return sweepLapsedProvisionalAccounts();
}
