import 'server-only';
import { findOneById, withAudit } from '../../../db/repository';
import { Forbidden } from '../../../lib/errors';
import type { Session } from '../../../lib/session';
import { parseInput } from '../../../lib/validation';
import { users } from '../../identity/schema/users';
import { supportReplies } from '../schema/support-replies';
import { supportRequests } from '../schema/support-requests';
import type { SupportNotifier, SupportReplyRow } from '../types';
import { SupportMessage } from '../validation/support';
import { requestToAnswer } from './staff';

/**
 * Replies to a request and tells its sender one is waiting. An admin may reply to any request, a curator only to one assigned
 * to them. Marking the reply `waitingOnSender` moves an open request to waiting_on_sender; any other reply leaves the status alone.
 * The notice carries no reply text: the reply is read on the sender's support page, behind their sign-in.
 *
 * @throws {Forbidden} the session is neither a curator nor an admin, or a curator and the request is not assigned to them, or
 * the reply is marked waiting on the sender and the request is not open, or the request is closed (nothing is saved).
 * @throws {NotFound} the reader may not see a request with this id.
 * @throws {ValidationError} the body is empty or over 4,000 characters.
 */
export async function replyToSupportRequest(
  session: Session,
  requestId: string,
  body: string,
  notifier: SupportNotifier,
  options: { waitingOnSender?: boolean } = {},
): Promise<SupportReplyRow> {
  const request = await requestToAnswer(session, requestId, 'reply to');
  if (request.status === 'closed') {
    throw new Forbidden(
      'This request is closed and takes no more replies; the sender\u2019s next message opens a new request linked to it',
    );
  }
  const text = parseInput(SupportMessage, body);
  const reply = await withAudit(session, async (write) => {
    const [row] = await write.insert(supportReplies, {
      requestId: request.id,
      body: text,
      authorRole: 'staff',
      visibility: 'public',
    });
    const now = new Date();
    if (options.waitingOnSender) {
      const moved = await write.moveSupportRequest(request.id, null, ['open'], {
        status: 'waiting_on_sender',
        lastStaffActivityAt: now,
      });
      if (moved.length === 0) {
        throw new Forbidden(
          'A reply can ask the sender to answer only while the request is open; this one is not',
        );
      }
    } else {
      await write.updateById(supportRequests, request.id, { lastStaffActivityAt: now });
    }
    return row as SupportReplyRow;
  });

  // The reply is saved before the mail goes, and a sender who has left gets none: neither loses the reply.
  // A signed-out sender has no page to read the reply on, so it goes in the mail whole.
  if (request.senderEmail) {
    await notifier.signedOutReply(request.senderEmail, text);
    return reply;
  }
  const sender = await findOneById(users, request.createdBy);
  if (sender) await notifier.replyWaiting(sender.email, request.subject);
  return reply;
}
