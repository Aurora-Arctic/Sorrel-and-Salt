import { emailChangeNoticeMessage } from '../emails/email-change-notice';
import { requestOrigin } from './request-origin';

// The mail to the address an account is leaving. Both stages build it here so the request and the completion say the same thing in the same words.

/** Mails `current` that a change to `address` was asked for or has finished. A failed send is logged by `send`, never thrown. */
export async function sendEmailChangeNotice(
  request: Request,
  current: string,
  address: string,
  stage: 'requested' | 'completed',
): Promise<void> {
  const { send } = await import('./mail');
  await send(
    await emailChangeNoticeMessage({
      to: current,
      url: await requestOrigin(request, '/api/auth'),
      stage,
      newDomain: address.slice(address.lastIndexOf('@') + 1),
      at: new Date(),
    }),
  );
}
