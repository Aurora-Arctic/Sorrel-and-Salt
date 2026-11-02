import { sweepStep } from './support-retention-sweep-steps';

/**
 * One sweep, started each time an admin opens the support page: the fallback for a request whose own run was lost. It closes
 * what has lapsed and anonymises what is due, and sends no notice. Two at once do no harm, since each write is guarded.
 */
export async function supportRetentionSweep(): Promise<{ closed: number; anonymised: number }> {
  'use workflow';
  return sweepStep();
}
