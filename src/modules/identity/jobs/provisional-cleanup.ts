import { createHook, sleep, start } from '@/lib/jobs/runtime';
import { PROVISIONAL_CLEANUP_TOKEN } from './provisional-cleanup-token';
import { sweepStep } from './provisional-cleanup-steps';

/**
 * Removes lapsed unverified accounts once a day, backing up the per-sign-up expiry run for an
 * account whose run was lost. It holds a hook token while it works, so a second start finds the
 * first and ends at once, and it releases the token before starting its successor.
 */
export async function provisionalCleanup(): Promise<'duplicate' | 'continued'> {
  'use workflow';
  {
    using owner = createHook({ token: PROVISIONAL_CLEANUP_TOKEN });
    if (await owner.getConflict()) return 'duplicate';
    await sweepStep();
    await sleep('1d');
  }
  // Recorded as a step, so a replay or retry of this hand-off starts one run; a stray second would
  // end as a duplicate on the token. `latest` makes the next day's run use the newest code.
  await start(provisionalCleanup, [], { deploymentId: 'latest' });
  return 'continued';
}
