'use step';

/* oxlint-disable no-console -- the log is how a batch lost after every retry is seen */
import { runRetentionBatch } from '../services/retention';
import type { RetentionBatch } from '../types';

// The steps of a support-retention batch. A file of its own, so the workflow bundle keeps only the calls to them and never the
// database code they reach.

/** Takes the page through its stage; how many requests it changed. A refused notice throws, so the SDK retries the step. */
export async function retentionBatchStep(batch: RetentionBatch): Promise<number> {
  return runRetentionBatch(batch);
}

/** Logs a batch that failed every attempt; the next day's run reads its requests again. */
export async function reportRetentionBatchFailed(
  kind: RetentionBatch['kind'],
  size: number,
): Promise<void> {
  console.error(
    `support retention: every attempt failed; a ${kind} batch of ${size} requests is left to the next day's run`,
  );
}
