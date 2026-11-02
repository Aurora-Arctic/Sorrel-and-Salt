import type { AccessPauseNotifier } from '@/modules/identity';
import type { MemberPauseNotifier } from '@/modules/coven';
import type { TimeoutNotifier } from '@/modules/support';
import { accessPausedMessage } from '../emails/access-paused';
import { covenAccessPausedMessage } from '../emails/coven-access-paused';
import { supportTimedOutMessage } from '../emails/support-timed-out';
import { requestOrigin } from './request-origin';

// Where a time-out or pause becomes a mail. The origin is Better Auth's, resolved against its allowed hosts, so a forged Host cannot
// point the link at another site. Every link opens the support page, which a paused account can still reach. Handed to the
// service by the GraphQL context.

export function pauseNotifier(
  request: Request,
): TimeoutNotifier & AccessPauseNotifier & MemberPauseNotifier {
  const supportUrl = async () => `${await requestOrigin(request, '/')}/support`;

  return {
    async timedOut(to, { until, note }) {
      const { send } = await import('./mail');
      await send(await supportTimedOutMessage({ to, url: await supportUrl(), until, note }));
    },
    async accessPaused(to, { until, note }) {
      const { send } = await import('./mail');
      await send(await accessPausedMessage({ to, url: await supportUrl(), until, note }));
    },
    async memberPaused(to, { covenName, until, note }) {
      const { send } = await import('./mail');
      await send(
        await covenAccessPausedMessage({ to, url: await supportUrl(), covenName, until, note }),
      );
    },
  };
}
