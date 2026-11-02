import 'server-only';
/* oxlint-disable no-console -- the log is how a failed start is seen */
import { findOneById } from '../../../db/repository';
import { startJob } from '../../../lib/jobs';
import type { Session } from '../../../lib/session';
import { supportStatusMessage } from '../../../lib/support-mail';
import type { Message } from '../../../lib/types';
import { users } from '../../identity/schema/users';
import type { SupportRequestRow } from '../types';
import { supportRequestLifecycle } from '../jobs/support-lifecycle';
import { supportRetentionSweep } from '../jobs/support-retention-sweep';

// Where the support jobs start. A file apart from retention.ts, which the jobs' steps call, so a job never imports itself.

/** The closing-soon notice for the request's sender, linked from `origin`; null for a sender who has left. */
async function closingNoticeFor(
  request: SupportRequestRow,
  origin: string,
): Promise<Message | null> {
  if (request.senderEmail) {
    return supportStatusMessage('closingSoon', origin, request.senderEmail, request.subject, null);
  }
  const sender = await findOneById(users, request.createdBy);
  if (!sender) return null;
  return supportStatusMessage('closingSoon', origin, sender.email, request.subject, request.id);
}

/**
 * Starts the run that notices, closes and anonymises a request once it is resolved, or anonymises it once it is closed. Never
 * throws: a failed start is logged, as the move it follows stands, and the readers and the sweep stand in for a lost run. The
 * notice is rendered here, linked from `origin`, as no step may render mail; `origin` is null for a request closed by staff,
 * which gets no notice.
 */
export async function scheduleSupportLifecycle(
  request: SupportRequestRow,
  origin: string | null,
): Promise<void> {
  try {
    const notice = origin === null ? null : await closingNoticeFor(request, origin);
    await startJob(supportRequestLifecycle, [request.id, notice]);
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
