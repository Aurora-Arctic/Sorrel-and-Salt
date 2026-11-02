import { replyNoticeStep, reportReplyNoticeUnsent } from './support-reply-notice-steps';

/**
 * Tells the sender of staff reply `replyId`, linked from `origin`, by a step the SDK retries. True once the transport took the
 * mail and the reply is stamped; false when there was nothing to send, or when every attempt failed, which is logged.
 */
export async function supportReplyNotice(replyId: string, origin: string): Promise<boolean> {
  'use workflow';
  try {
    return await replyNoticeStep(replyId, origin);
  } catch {
    await reportReplyNoticeUnsent(replyId);
    return false;
  }
}
