import 'server-only';
/* oxlint-disable no-console -- the log is how a failed start is seen */
import { startJob } from '../../../lib/jobs';
import { sendReplyNotice } from './reply-notice';
import { supportReplyNotice } from '../jobs/support-reply-notice';
import { supportRetention } from '../jobs/support-retention';

// Where the support jobs start. A file apart from the services the jobs' steps call, so a job never imports itself.

/**
 * Starts one day's support-retention run as of `now`, its notices linked from `origin`, and returns its run id. Only the daily
 * cron route calls it; the run reads the ids due itself, so it carries only the time and the origin.
 */
export async function startSupportRetention(
  origin: string,
  now: Date = new Date(),
): Promise<string> {
  return startJob(supportRetention, [now.getTime(), origin]);
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
