import type { SupportNotifier } from '@/modules/support';
import { supportEmailReplyMessage } from '../emails/support-email-reply';
import { supportReceivedMessage } from '../emails/support-received';
import { supportClosingSoonMessage } from '../emails/support-closing-soon';
import { supportResolvedMessage } from '../emails/support-resolved';
import { supportReplyNoticeMessage } from '../emails/support-reply-notice';
import { requestOrigin } from './request-origin';
import { supportRequestPath } from './support-path';

// Where a reply's notice becomes a mail. The origin is Better Auth's, resolved against its allowed hosts, so a forged Host cannot
// point the link at another site. Handed to the service by the GraphQL context.

export function supportNotifier(request: Request): SupportNotifier {
  // A signed-out sender has no page to open, so their mail links to the support form; a signed-in sender's opens the request.
  async function statusMail(
    message: typeof supportReceivedMessage,
    to: string,
    requestSubject: string,
    requestId: string | null,
  ): Promise<void> {
    const origin = await requestOrigin(request, '/');
    const url = `${origin}${requestId === null ? '/support' : supportRequestPath(requestId)}`;
    const { send } = await import('./mail');
    await send(await message({ to, url, requestSubject, signedOut: requestId === null }));
  }

  return {
    async replyWaiting(to, requestSubject, requestId) {
      const url = `${await requestOrigin(request, '/')}${supportRequestPath(requestId)}`;
      const { send } = await import('./mail');
      await send(await supportReplyNoticeMessage({ to, url, requestSubject }));
    },
    received: (to, requestSubject, requestId) =>
      statusMail(supportReceivedMessage, to, requestSubject, requestId),
    resolved: (to, requestSubject, requestId) =>
      statusMail(supportResolvedMessage, to, requestSubject, requestId),
    closingSoon: (to, requestSubject, requestId) =>
      statusMail(supportClosingSoonMessage, to, requestSubject, requestId),
    async signedOutReply(to, body) {
      const url = `${await requestOrigin(request, '/')}/support`;
      const { send } = await import('./mail');
      await send(await supportEmailReplyMessage({ to, url, body }));
    },
  };
}
