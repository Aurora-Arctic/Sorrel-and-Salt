import 'server-only';
import { findOneById, withAudit } from '../../../db/repository';
import type { Session } from '../../../lib/session';
import { parseInput } from '../../../lib/validation';
import { users } from '../../identity/schema/users';
import { supportReplies } from '../schema/support-replies';
import type { SupportNotifier, SupportReplyRow } from '../types';
import { SupportMessage } from '../validation/support';
import { requestToAnswer } from './staff';

/**
 * Replies to a request and tells its sender one is waiting. An admin may reply to any request, a curator only to one assigned
 * to them. The notice carries no reply text: the reply is read on the sender's support page, behind their sign-in.
 *
 * @throws {Forbidden} the session is neither a curator nor an admin, or a curator and the request is not assigned to them.
 * @throws {NotFound} the reader may not see a request with this id.
 * @throws {ValidationError} the body is empty or over 4,000 characters.
 */
export async function replyToSupportRequest(
  session: Session,
  requestId: string,
  body: string,
  notifier: SupportNotifier,
): Promise<SupportReplyRow> {
  const request = await requestToAnswer(session, requestId, 'reply to');
  const text = parseInput(SupportMessage, body);
  const reply = await withAudit(session, async (write) => {
    const [row] = await write.insert(supportReplies, { requestId: request.id, body: text });
    return row as SupportReplyRow;
  });

  // The reply is saved before the mail goes, and a sender who has left gets none: neither loses the reply.
  const sender = await findOneById(users, request.createdBy);
  if (sender) await notifier.replyWaiting(sender.email);
  return reply;
}
