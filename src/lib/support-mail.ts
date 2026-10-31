import type { SupportNotifier } from '@/modules/support';
import { supportReplyNoticeMessage } from '../emails/support-reply-notice';
import { requestOrigin } from './request-origin';

// Where a reply's notice becomes a mail. The origin is Better Auth's, resolved against its allowed hosts, so a forged Host cannot
// point the link at another site. Handed to the service by the GraphQL context.

export function supportNotifier(request: Request): SupportNotifier {
  return {
    async replyWaiting(to, requestSubject) {
      const url = `${await requestOrigin(request, '/')}/account/support`;
      const { send } = await import('./mail');
      await send(await supportReplyNoticeMessage({ to, url, requestSubject }));
    },
  };
}
