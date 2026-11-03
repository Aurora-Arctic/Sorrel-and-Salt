import 'server-only';
import { withAudit } from '../../../db/repository';
import { Forbidden } from '../../../lib/errors';
import type { Session } from '../../../lib/session';
import { parseInput } from '../../../lib/validation';
import { supportReplies } from '../schema/support-replies';
import { supportRequests } from '../schema/support-requests';
import type { SupportNotifier, SupportReplyRow } from '../types';
import { SupportMessage } from '../validation/support';
import { scheduleReplyNotice } from './retention-start';
import { refuseAnonymised, requestToAnswer } from './staff';

/**
 * Replies to a request and tells its sender one is waiting. A keeper may reply to any request, a curator only to one assigned
 * to them. Marking the reply `waitingOnSender` moves an open request to waiting_on_sender; any other reply leaves the status alone.
 * The notice carries no reply text: the reply is read on the sender's support page, behind their sign-in. A signed-out sender, who has
 * no such page, is mailed the reply whole. Either goes out through a retried job, which stamps the reply once the mail is taken.
 *
 * @throws {Forbidden} the session is neither a curator nor a keeper, or a curator and the request is not assigned to them, or
 * the reply is marked waiting on the sender and the request is not open, or the request is closed or anonymised (nothing is saved).
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
  refuseAnonymised(request);
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

  // The reply is saved before the mail goes, and the job sends a sender who has left none: neither loses the reply.
  await scheduleReplyNotice(reply.id, await notifier.origin());
  return reply;
}
