import 'server-only';
import { findOneById } from '../../../db/repository';
import { deliver } from '../../../lib/mail-transport';
import { emailChangeNoticeMessage } from '../../../lib/email-change-notice';
import { users } from '../schema/users';
import { isPlaceholderEmail } from './email';
import type { Message } from '../../../lib/types';
import type { AccountNotice } from '../types';

// The account notices, built from the rows when they are sent, so the job that retries one carries ids alone.

/** The mail for `notice` as the rows stand, or null when there is none to send: the account is gone or unmailable, or has nothing to say. */
export async function accountNoticeMessage(notice: AccountNotice): Promise<Message | null> {
  const user = await findOneById(users, notice.userId);
  if (!user || isPlaceholderEmail(user.email)) return null;
  if (!user.pendingEmail) return null;
  return emailChangeNoticeMessage(
    notice.origin,
    user.email,
    user.pendingEmail,
    'requested',
    user.verificationSentAt ?? new Date(),
  );
}

/** Builds and sends the mail for `notice`; true once the transport took it, false when there was none to send. A transport failure throws, so a job's step is retried. */
export async function sendAccountNotice(notice: AccountNotice): Promise<boolean> {
  const message = await accountNoticeMessage(notice);
  if (!message) return false;
  return deliver(message);
}
