'use step';

import {
  type SupportRequestNext,
  advanceSupportRequest,
  sendClosingNotice,
} from '../services/retention';

// The steps of the support-lifecycle job. A file of its own, so the workflow bundle keeps only the calls to them and never the
// database code they reach.

/** Does whatever is due on the request now, and says what the run does next. */
export async function advanceStep(
  requestId: string,
  noticeSkippedFor: number | null,
): Promise<SupportRequestNext> {
  return advanceSupportRequest(requestId, noticeSkippedFor);
}

/** Renders the closing-soon notice from the row and sends it; true once the transport took it. A transport failure throws, so the SDK retries the step. */
export async function closingNoticeStep(requestId: string, origin: string): Promise<boolean> {
  return sendClosingNotice(requestId, origin);
}
