import { emailChangeNoticeMessage as noticeMessage } from '../emails/email-change-notice';
import type { Message } from './types';

// The mail to the address an account is leaving. Both stages build it here so the request and the completion say the same thing in the same words.

export function emailChangeNoticeMessage(
  origin: string,
  current: string,
  address: string,
  stage: 'requested' | 'completed',
  at: Date,
): Promise<Message> {
  return noticeMessage({
    to: current,
    url: origin,
    stage,
    newDomain: address.slice(address.lastIndexOf('@') + 1),
    at,
  });
}
