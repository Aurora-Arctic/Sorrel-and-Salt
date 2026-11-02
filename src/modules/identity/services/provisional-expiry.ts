import 'server-only';
import { startJob } from '@/lib/jobs';
import { provisionalAccountExpiry } from '../jobs/provisional-expiry';

/** Starts the run that removes the account if it is still unverified once its window has passed. */
export function scheduleProvisionalExpiry(userId: string): Promise<string> {
  return startJob(provisionalAccountExpiry, [userId]);
}
