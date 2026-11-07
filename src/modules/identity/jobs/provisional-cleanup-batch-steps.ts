'use step';

/* oxlint-disable no-console -- the log is how a batch lost after every retry is seen */
import { deleteLapsedProvisionalAccounts } from '../services/provisional-accounts';

// The steps of a provisional-cleanup batch. A file of its own, so the workflow bundle keeps only the calls to them and never the
// database code they reach.

/** A thrown error makes the SDK retry the step. */
export async function cleanupBatchStep(ids: readonly string[]): Promise<number> {
  return deleteLapsedProvisionalAccounts(ids);
}

export async function reportCleanupBatchFailed(size: number): Promise<void> {
  console.error(
    `provisional cleanup: every attempt failed; a batch of ${size} accounts is left to the next day's run`,
  );
}
