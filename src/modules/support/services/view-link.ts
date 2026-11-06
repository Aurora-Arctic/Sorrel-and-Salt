import 'server-only';
import { createHash, randomBytes } from 'node:crypto';
import {
  findOneById,
  countSenderRepliesSince,
  findPublicSupportReplies,
  findSupportRequestByViewTokenHash,
  withAudit,
} from '../../../db/repository';
import { NotFound, RateLimited } from '../../../lib/errors';
import { SIGNED_OUT_SENDER_ID } from '../../../lib/support-sender';
import { addressCountKey, clientCountKey } from '../../../lib/send-count-key';
import { parseInput } from '../../../lib/validation';
import { supportRequests } from '../schema/support-requests';
import { supportReplies } from '../schema/support-replies';
import type { SupportRequestRow, SupportRequestView } from '../types';
import { SupportMessage } from '../validation/support';
import { SEND_WINDOW_SECONDS, refuseTimedOutReply } from './time-out-refusals';
import {
  SIGNED_OUT_ADDRESS_LIMIT,
  SIGNED_OUT_IP_LIMIT,
  SIGNED_OUT_WINDOW_SECONDS,
} from './signed-out-limits';

// The link in each mail about a signed-out request. Its token is minted afresh by the step that sends the mail and only its
// SHA-256 hash is stored, so the newest mailed link alone opens the request. A request a real account holds, or one
// anonymised, has no address on the row, so no token finds it (claude-docs/design-decisions/m15.48-anonymous-sender.md).

const DAY_MS = SIGNED_OUT_WINDOW_SECONDS * 1000;

/** Replies one signed-out request may take through its link in 24 hours. */
export const SIGNED_OUT_REPLY_REQUEST_LIMIT = 5;

const hashOf = (token: string) => createHash('sha256').update(token).digest('hex');

/**
 * Mints a new view token for signed-out request `requestId`, stores its hash in place of the last one and returns the token,
 * for the mail to carry. It appears nowhere else.
 */
export async function mintSupportViewToken(requestId: string): Promise<string> {
  const token = randomBytes(32).toString('base64url');
  const request = await findOneById(supportRequests, requestId);
  if (!request) throw new NotFound(NO_SUCH_REQUEST);
  // Stamped as the request's own sender, so the row's last editor stays the account that sent it.
  await withAudit({ userId: request.createdBy }, (write) =>
    write.setSupportViewToken(requestId, hashOf(token)),
  );
  return token;
}

const NO_SUCH_REQUEST = 'No such support request';

async function requestByToken(token: string): Promise<SupportRequestRow> {
  const request = token ? await findSupportRequestByViewTokenHash(hashOf(token)) : undefined;
  if (!request) throw new NotFound(NO_SUCH_REQUEST);
  return request;
}

/**
 * The request a mailed link opens, with its public replies and nothing staff hold: no internal note, issue, assignee or
 * address. Open to a caller with no session; the token is what authorises it.
 *
 * @throws {NotFound} no live signed-out request has this token: it is wrong, older than the newest mail, or the request was claimed or anonymised.
 */
export async function getSupportRequestByViewToken(token: string): Promise<SupportRequestView> {
  const request = await requestByToken(token);
  const replies = await findPublicSupportReplies(request.id);
  return {
    id: request.id,
    about: request.about,
    status: request.status,
    subject: request.subject,
    message: request.message,
    createdAt: request.createdAt,
    replies: replies.map((reply) => ({
      id: reply.id,
      authorRole: reply.authorRole,
      body: reply.body,
      createdAt: reply.createdAt,
    })),
  };
}

/**
 * A signed-out sender's reply from the mailed link, written as the request's own sender account: the anonymous account, or the
 * seeded signed-out sender on a request from before those. It moves the request as a signed-in reply does (a waiting or resolved
 * one reopens), and counts toward the address's and the client's send limits and a cap on the request. A filled `website`
 * field is a bot's: nothing is stored or counted.
 *
 * @throws {NotFound} the token finds no request, or the request is closed.
 * @throws {Forbidden} the request’s sender stands under a keeper’s time-out.
 * @throws {RateLimited} the address, the client or the request has had too many in 24 hours.
 * @throws {ValidationError} the body is empty or over the message limit.
 */
export async function replyToSupportRequestByViewToken(
  token: string,
  input: { body: string; website?: string | null },
  context: { clientIp: string | null; now?: Date },
): Promise<void> {
  if (input.website) return;
  const text = parseInput(SupportMessage, input.body);
  const request = await requestByToken(token);
  if (request.status === 'closed') throw new NotFound(NO_SUCH_REQUEST);
  const senderId = request.createdBy;
  const now = context.now ?? new Date();
  const tooMany = () =>
    new RateLimited(
      SIGNED_OUT_WINDOW_SECONDS,
      'You have sent too many replies today. Try again later.',
    );

  if (
    (await countSenderRepliesSince(request.id, new Date(now.getTime() - DAY_MS))) >=
    SIGNED_OUT_REPLY_REQUEST_LIMIT
  ) {
    throw tooMany();
  }
  const counts = await withAudit({ userId: SIGNED_OUT_SENDER_ID }, (write) =>
    write.countSignedOutSend(
      addressCountKey(request.senderEmail ?? ''),
      clientCountKey(context.clientIp ?? 'unknown'),
      now,
      SIGNED_OUT_WINDOW_SECONDS,
    ),
  );
  if (counts.client > SIGNED_OUT_IP_LIMIT || counts.address > SIGNED_OUT_ADDRESS_LIMIT)
    throw tooMany();

  await withAudit({ userId: senderId }, async (write) => {
    // The token proves which request; a keeper’s time-out on its sender still holds, as for a signed-in reply.
    const { timedOut } = await write.lockSupportSender(senderId, SEND_WINDOW_SECONDS);
    refuseTimedOutReply(timedOut);
    const [moved] = await write.moveSupportRequest(
      request.id,
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
    if (!moved) throw new NotFound(NO_SUCH_REQUEST);
    await write.insert(supportReplies, {
      requestId: request.id,
      body: text,
      authorRole: 'sender',
      visibility: 'public',
    });
  });
}
