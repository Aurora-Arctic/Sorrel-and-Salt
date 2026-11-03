'use step';

import { findLapsedProvisionalPage } from '../services/provisional-accounts';

// The step of the daily provisional-cleanup job. A file of its own, so the workflow bundle keeps only the call to it and never the
// database code it reaches.

/** One page of the ids of lapsed provisional accounts, after `after`: ids alone, so the run's event log holds nothing else. */
export async function lapsedPageStep(after: string | null): Promise<string[]> {
  return findLapsedProvisionalPage(after);
}
