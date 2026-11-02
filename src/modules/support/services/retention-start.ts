import 'server-only';
/* oxlint-disable no-console -- the log is how a failed start is seen */
import { startJob } from '../../../lib/jobs';
import type { Session } from '../../../lib/session';
import type { SupportRequestRow } from '../types';
import { sendReplyNotice } from './reply-notice';
import { supportRequestLifecycle } from '../jobs/support-lifecycle';
import { supportReplyNotice } from '../jobs/support-reply-notice';
import { supportRetentionSweep } from '../jobs/support-retention-sweep';

// Where the support jobs start. A file apart from the services the jobs' steps call, so a job never imports itself.

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

/**
 * Starts the run that tells the sender of staff reply `replyId`, linked from `origin`; the run carries only those two, and its
 * step reads the address and the subject when it sends. Never throws: when the run cannot be started, the notice is tried once
 * here, so a queue outage costs the retries and not the mail, and a failure of that try is logged.
 */
export async function scheduleReplyNotice(replyId: string, origin: string): Promise<void> {
  try {
    await startJob(supportReplyNotice, [replyId, origin]);
    return;
  } catch (error) {
    console.error(`support reply notice not started: reply ${replyId}; trying it once`, error);
  }
  try {
    await sendReplyNotice(replyId, origin);
  } catch {
    // `deliver` logged it.
  }
}
