'use step';

import { sendReplyNotice } from '../services/reply-notice';

// The step of the reply-notice job. A file of its own, so the workflow bundle keeps only the call to it and never the database
// code it reaches.

// The log is how a notice lost after every retry is seen.
/* oxlint-disable no-console */

/** Renders the reply's mail from the rows and sends it; true once the transport took it. A transport failure throws, so the SDK retries the step. */
export async function replyNoticeStep(replyId: string, origin: string): Promise<boolean> {
  return sendReplyNotice(replyId, origin);
}

/** Logs a notice that failed every attempt. */
export async function reportReplyNoticeUnsent(replyId: string): Promise<void> {
  console.error(`support: every attempt failed; the notice of reply ${replyId} was not sent`);
}
