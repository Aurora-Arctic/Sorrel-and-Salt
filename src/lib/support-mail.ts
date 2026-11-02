import type { SupportNotifier } from '@/modules/support';
import { supportEmailReplyMessage } from '../emails/support-email-reply';
import { supportReceivedMessage } from '../emails/support-received';
import { supportResolvedMessage } from '../emails/support-resolved';
import { supportReplyNoticeMessage } from '../emails/support-reply-notice';
import { requestOrigin } from './request-origin';
import { supportRequestPath } from './support-path';
import type { Message } from './types';

// Where a reply's notice becomes a mail. The origin is Better Auth's, resolved against its allowed hosts, so a forged Host cannot
// point the link at another site. Handed to the service by the GraphQL context. The closing-soon notice is
// rendered by its job's step instead (src/modules/support/services/retention.ts).

const STATUS_MESSAGES = {
  received: supportReceivedMessage,
  resolved: supportResolvedMessage,
};

/**
 * One of the status mails, its link built on `origin`. A signed-out sender has no page to open, so `requestId` is null and their
 * mail links to the support form; a signed-in sender's opens the request.
 */
function supportStatusMessage(
  mail: keyof typeof STATUS_MESSAGES,
  origin: string,
  to: string,
  requestSubject: string,
  requestId: string | null,
): Promise<Message> {
  const url = `${origin}${requestId === null ? '/support' : supportRequestPath(requestId)}`;
  return STATUS_MESSAGES[mail]({ to, url, requestSubject, signedOut: requestId === null });
}

export function supportNotifier(request: Request): SupportNotifier {
  async function statusMail(
    mail: keyof typeof STATUS_MESSAGES,
    to: string,
    requestSubject: string,
    requestId: string | null,
  ): Promise<void> {
    const origin = await requestOrigin(request, '/');
    const { send } = await import('./mail');
    await send(await supportStatusMessage(mail, origin, to, requestSubject, requestId));
  }

  return {
    origin: () => requestOrigin(request, '/'),
    async replyWaiting(to, requestSubject, requestId) {
      const url = `${await requestOrigin(request, '/')}${supportRequestPath(requestId)}`;
      const { send } = await import('./mail');
      await send(await supportReplyNoticeMessage({ to, url, requestSubject }));
    },
    received: (to, requestSubject, requestId) =>
      statusMail('received', to, requestSubject, requestId),
    resolved: (to, requestSubject, requestId) =>
      statusMail('resolved', to, requestSubject, requestId),
    async signedOutReply(to, body) {
      const url = `${await requestOrigin(request, '/')}/support`;
      const { send } = await import('./mail');
      await send(await supportEmailReplyMessage({ to, url, body }));
    },
  };
}
