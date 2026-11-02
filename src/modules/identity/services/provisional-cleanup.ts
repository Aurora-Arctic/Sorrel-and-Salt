import 'server-only';
import { startJob } from '@/lib/jobs';
import { provisionalCleanup } from '../jobs/provisional-cleanup';

/**
 * Starts one day's cleanup of lapsed unverified accounts and returns its run id. Only the daily cron route calls it; the run reads
 * the lapsed ids itself, so it carries no arguments.
 */
export async function startProvisionalCleanup(): Promise<string> {
  return startJob(provisionalCleanup, []);
}
