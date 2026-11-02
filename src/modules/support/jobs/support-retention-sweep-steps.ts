'use step';

import { sweepSupportRetention } from '../services/retention';

// The step of the support-retention sweep. A file of its own, so the workflow bundle keeps only the call to it and never the
// database code it reaches.

/** Closes every lapsed resolved request and anonymises every request closed twelve months ago or more; how many of each. */
export async function sweepStep(): Promise<{ closed: number; anonymised: number }> {
  return sweepSupportRetention();
}
