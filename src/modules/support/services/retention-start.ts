import 'server-only';
/* oxlint-disable no-console -- the log is how a failed start is seen */
import { startJob } from '../../../lib/jobs';
import type { Session } from '../../../lib/session';
import type { SupportRequestRow } from '../types';
import { supportRequestLifecycle } from '../jobs/support-lifecycle';
import { supportRetentionSweep } from '../jobs/support-retention-sweep';

// Where the support jobs start. A file apart from retention.ts, which the jobs' steps call, so a job never imports itself.

/**
 * Starts the run that notices, closes and anonymises a request once it is resolved, or anonymises it once it is closed. Never
 * throws: a failed start is logged, as the move it follows stands, and the readers and the sweep stand in for a lost run. The run
 * carries only the id and `origin`, the site the notice links to; its step reads the sender and the subject when it sends.
 * `origin` is null for a request closed by staff, which gets no notice.
 */
export async function scheduleSupportLifecycle(
  request: SupportRequestRow,
  origin: string | null,
): Promise<void> {
  try {
    await startJob(supportRequestLifecycle, [request.id, origin]);
  } catch (error) {
    console.error(`support lifecycle not started: request ${request.id}`, error);
  }
}

/**
 * Starts one sweep run when an admin opens the support page; a curator's visit starts none. Never throws: a failed start is
 * logged, and the next visit tries again.
 */
export async function startSupportRetentionSweep(session: Session): Promise<void> {
  if (session.role !== 'admin') return;
  try {
    await startJob(supportRetentionSweep, []);
  } catch (error) {
    console.error('support retention sweep not started', error);
  }
}
