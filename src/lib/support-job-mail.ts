import { supportClosingSoonMessage } from '../emails/support-closing-soon';
import { supportEmailReplyMessage } from '../emails/support-email-reply';
import { supportReplyNoticeMessage } from '../emails/support-reply-notice';
import { supportReceivedMessage } from '../emails/support-received';
import { supportResolvedMessage } from '../emails/support-resolved';
import { SUPPORT_PATH, supportRequestPath, supportViewPath } from './support-path';
import type { Message } from './types';

// The support mails a job's step renders from the row when it sends, so a run carries ids and never an address or a subject.
// Only templates and paths are imported, as the step bundle takes in everything this file reaches.

const signedOutPath = (viewToken: string | undefined) =>
  viewToken ? supportViewPath(viewToken) : SUPPORT_PATH;

/** A signed-out sender has no page to open, so `requestId` is null and the mail links to the support form. */
export function supportClosingNoticeMessage(
  origin: string,
  to: string,
  requestSubject: string,
  requestId: string | null,
  timeLeftMs: number,
  viewToken?: string,
): Promise<Message> {
  const signedOut = requestId === null;
  const url = `${origin}${signedOut ? signedOutPath(viewToken) : supportRequestPath(requestId)}`;
  return supportClosingSoonMessage({
    to,
    url,
    requestSubject,
    signedOut,
    viewLink: signedOut && Boolean(viewToken),
    timeLeftMs,
  });
}

/** A signed-out sender is linked to the request’s page behind their mailed link. */
export function supportReplyMessage(
  origin: string,
  to: string,
  reply: {
    requestId: string;
    requestSubject: string;
    body: string;
    signedOut: boolean;
    viewToken?: string;
  },
): Promise<Message> {
  if (reply.signedOut)
    return supportEmailReplyMessage({
      to,
      url: `${origin}${signedOutPath(reply.viewToken)}`,
      requestSubject: reply.requestSubject,
      viewLink: Boolean(reply.viewToken),
    });
  const url = `${origin}${supportRequestPath(reply.requestId)}`;
  return supportReplyNoticeMessage({ to, url, requestSubject: reply.requestSubject });
}

const STATUS_MESSAGES = {
  received: supportReceivedMessage,
  resolved: supportResolvedMessage,
};

/** A signed-out sender has no page to open, so `requestId` is null and the mail links to the support form. */
export function supportStatusMessage(
  mail: keyof typeof STATUS_MESSAGES,
  origin: string,
  to: string,
  requestSubject: string,
  requestId: string | null,
  viewToken?: string,
): Promise<Message> {
  const url = `${origin}${requestId === null ? signedOutPath(viewToken) : supportRequestPath(requestId)}`;
  return STATUS_MESSAGES[mail]({
    to,
    url,
    requestSubject,
    signedOut: requestId === null,
    viewLink: requestId === null && Boolean(viewToken),
  });
}
