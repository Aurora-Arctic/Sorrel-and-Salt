import 'server-only';
/* oxlint-disable no-console -- the log is how a failed start is seen */
import { jobTokenActive, startJob } from '@/lib/jobs';
import { provisionalCleanup } from '../jobs/provisional-cleanup';
import { PROVISIONAL_CLEANUP_TOKEN } from '../jobs/provisional-cleanup-token';

/**
 * Starts the daily cleanup unless a run already holds its token, and never throws: a failed start
 * is logged, as the sign-up or the page it rides on stands either way and the next visit retries.
 * Returns the new run's id, or null when one is already going or the start failed.
 */
export async function ensureProvisionalCleanup(): Promise<string | null> {
  try {
    if (await jobTokenActive(PROVISIONAL_CLEANUP_TOKEN)) return null;
    return await startJob(provisionalCleanup, []);
  } catch (error) {
    console.error('provisional cleanup not started', error);
    return null;
  }
}
