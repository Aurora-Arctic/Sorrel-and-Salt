import 'server-only';
import type { AuditWriter } from '../../../db/repository';
import { supportReplies } from '../schema/support-replies';
import type { SupportRequestRow } from '../types';

/**
 * Reopens request `id` for its sender `senderId` and adds their public message, in the caller's write. The request comes back, or
 * `undefined` when it is closed or gone, in which case nothing is written.
 */
export async function reopenWithSenderReply(
  write: AuditWriter,
  id: string,
  senderId: string,
  text: string,
  now: Date,
): Promise<SupportRequestRow | undefined> {
  const [moved] = await write.moveSupportRequest(
    id,
    senderId,
    ['open', 'waiting_on_sender', 'resolved'],
    {
      status: 'open',
      resolvedAt: null,
      resolvedBy: null,
      closingNoticeSentAt: null,
      lastSenderActivityAt: now,
    },
  );
  if (!moved) return undefined;
  await write.insert(supportReplies, {
    requestId: id,
    body: text,
    authorRole: 'sender',
    visibility: 'public',
  });
  return moved;
}
