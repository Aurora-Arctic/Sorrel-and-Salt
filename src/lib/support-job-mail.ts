import { supportClosingSoonMessage } from '../emails/support-closing-soon';
import { supportEmailReplyMessage } from '../emails/support-email-reply';
import { supportReplyNoticeMessage } from '../emails/support-reply-notice';
import { supportReceivedMessage } from '../emails/support-received';
import { supportResolvedMessage } from '../emails/support-resolved';
import { supportRequestPath } from './support-path';
import type { Message } from './types';

// The support mails a job's step renders from the row when it sends, so a run carries ids and never an address or a subject.
// Only templates and paths are imported, as the step bundle takes in everything this file reaches.

/**
 * The closing-soon notice, linked from `origin`. A signed-out sender has no page to open, so `requestId` is null and the mail
 * links to the support form; a signed-in sender's opens the request.
 */
export function supportClosingNoticeMessage(
  origin: string,
  to: string,
  requestSubject: string,
  requestId: string | null,
  timeLeftMs: number,
): Promise<Message> {
  const signedOut = requestId === null;
  const url = `${origin}${signedOut ? '/support' : supportRequestPath(requestId)}`;
  return supportClosingSoonMessage({ to, url, requestSubject, signedOut, timeLeftMs });
}

/**
 * The mail telling a sender of a staff reply, linked from `origin`. A signed-in sender is told one is waiting, with no reply text,
 * and linked to the request; a signed-out sender, who has no page to read it on, gets `body` whole, linked to the support form.
 */
export function supportReplyMessage(
  origin: string,
  to: string,
  reply: { requestId: string; requestSubject: string; body: string; signedOut: boolean },
): Promise<Message> {
  if (reply.signedOut)
    return supportEmailReplyMessage({ to, url: `${origin}/support`, body: reply.body });
  const url = `${origin}${supportRequestPath(reply.requestId)}`;
  return supportReplyNoticeMessage({ to, url, requestSubject: reply.requestSubject });
}

const STATUS_MESSAGES = {
  received: supportReceivedMessage,
  resolved: supportResolvedMessage,
};

/**
 * The received or resolved mail, linked from `origin`. A signed-out sender has no page to open, so `requestId` is null and the
 * mail links to the support form; a signed-in sender's opens the request.
 */
export function supportStatusMessage(
  mail: keyof typeof STATUS_MESSAGES,
  origin: string,
  to: string,
  requestSubject: string,
  requestId: string | null,
): Promise<Message> {
  const url = `${origin}${requestId === null ? '/support' : supportRequestPath(requestId)}`;
  return STATUS_MESSAGES[mail]({ to, url, requestSubject, signedOut: requestId === null });
}
