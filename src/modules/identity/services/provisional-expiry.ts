import 'server-only';
import { startJob } from '@/lib/jobs';
import { provisionalAccountExpiry } from '../jobs/provisional-expiry';

export function scheduleProvisionalExpiry(userId: string): Promise<string> {
  return startJob(provisionalAccountExpiry, [userId]);
}
