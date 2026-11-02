'use step';

import {
  type SupportRequestNext,
  advanceSupportRequest,
  sendClosingNotice,
} from '../services/retention';
import type { Message } from '../../../lib/types';

// The steps of the support-lifecycle job. A file of its own, so the workflow bundle keeps only the calls to them and never the
// database code they reach.

/** Does whatever is due on the request now, and says what the run does next. */
export async function advanceStep(
  requestId: string,
  noticeSkippedFor: number | null,
): Promise<SupportRequestNext> {
  return advanceSupportRequest(requestId, noticeSkippedFor);
}

/** Sends the closing-soon notice; true once the transport took it. A transport failure throws, so the SDK retries the step. */
export async function closingNoticeStep(requestId: string, notice: Message): Promise<boolean> {
  return sendClosingNotice(requestId, notice);
}
