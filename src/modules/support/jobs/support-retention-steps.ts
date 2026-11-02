'use step';

import { findRetentionDue } from '../services/retention';
import type { RetentionStage } from '../types';

// The step of the daily support-retention job. A file of its own, so the workflow bundle keeps only the call to it and never the
// database code it reaches.

/** One page of the ids due for `stage` as of `now`, after `after`: ids alone, so the run's event log holds nothing else. */
export async function retentionDueStep(
  stage: RetentionStage,
  now: number,
  after: string | null,
): Promise<string[]> {
  return findRetentionDue(stage, now, after);
}
