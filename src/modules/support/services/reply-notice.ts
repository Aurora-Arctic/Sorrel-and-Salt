import 'server-only';
import { findOneById, findReplyAwaitingNotice, withAudit } from '../../../db/repository';
import { deliver } from '../../../lib/mail-transport';
import { supportReplyMessage } from '../../../lib/support-job-mail';
import { SYSTEM_ACTOR_ID } from '../../../lib/system-actor';
import { users } from '../../identity/schema/users';
import { supportRequests } from '../schema/support-requests';
import { mintSupportViewToken } from './view-link';
import type { Message } from '../../../lib/types';

// The mail that tells a sender of a staff reply, sent by its job's step as the System account. The step reads the reply, the
// request and the sender's address when it runs, so the run carries ids alone.

const SYSTEM = { userId: SYSTEM_ACTOR_ID };

/** The mail for reply `replyId` as the rows stand, or null when it is not one to send: not a public staff reply, already sent, or to a sender who has left. */
async function replyMailFor(replyId: string, origin: string): Promise<Message | null> {
  const reply = await findReplyAwaitingNotice(replyId);
  if (!reply) return null;
  const request = await findOneById(supportRequests, reply.requestId);
  if (!request || request.createdBy === SYSTEM_ACTOR_ID) return null;
  const to = request.senderEmail ?? (await findOneById(users, request.createdBy))?.email;
  if (!to) return null;
  return supportReplyMessage(origin, to, {
    requestId: request.id,
    requestSubject: request.subject,
    body: reply.body,
    signedOut: request.senderEmail !== null,
    viewToken: request.senderEmail !== null ? await mintSupportViewToken(request.id) : undefined,
  });
}

/**
 * Renders the mail for staff reply `replyId`, linked from `origin`, sends it, and stamps `notice_sent_at` once the transport took
 * it. True when this call sent it.
 *
 * @throws {MailNotSent} the transport failed this attempt; nothing is stamped, so a retry sends it.
 */
export async function sendReplyNotice(replyId: string, origin: string): Promise<boolean> {
  const message = await replyMailFor(replyId, origin);
  if (!message || !(await deliver(message))) return false;
  await withAudit(SYSTEM, (write) => write.markReplyNoticeSent(replyId, new Date()));
  return true;
}
