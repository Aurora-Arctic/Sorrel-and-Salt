import 'server-only';
import { findOneById, findOwnProviderIds } from '../../../db/repository';
import { accountExistsNotice, passwordChangedNotice } from '../../../lib/account-notice-mail';
import { deliver } from '../../../lib/mail-transport';
import { emailChangeNoticeMessage } from '../../../lib/email-change-notice';
import { users } from '../schema/users';
import { clearFormerEmail, isPlaceholderEmail } from './email';
import type { Message } from '../../../lib/types';
import type { AccountNotice } from '../types';

// The account notices, built from the rows when they are sent, so the job that retries one carries ids alone.

export async function accountNoticeMessage(notice: AccountNotice): Promise<Message | null> {
  const user = await findOneById(users, notice.userId);
  if (!user || isPlaceholderEmail(user.email)) return null;
  if (notice.kind === 'account-exists') {
    return accountExistsNotice(notice.origin, user.email, await findOwnProviderIds(user.id));
  }
  if (notice.kind === 'password-changed') {
    return passwordChangedNotice(notice.origin, user.email, notice.how);
  }
  if (notice.kind === 'change-completed') {
    if (!user.formerEmail) return null;
    return emailChangeNoticeMessage(
      notice.origin,
      user.formerEmail,
      user.email,
      'completed',
      new Date(),
    );
  }
  if (!user.pendingEmail) return null;
  return emailChangeNoticeMessage(
    notice.origin,
    user.email,
    user.pendingEmail,
    'requested',
    user.verificationSentAt ?? new Date(),
  );
}

/** A transport failure throws, so a job's step is retried. */
export async function sendAccountNotice(notice: AccountNotice): Promise<boolean> {
  if (notice.kind === 'change-completed') return sendChangeCompleted(notice);
  const message = await accountNoticeMessage(notice);
  if (!message) return false;
  return deliver(message);
}

/**
 Clears the address only once the transport took it, matched on it and on the move the mail named, so a move made while it was going out is still told.
 */
async function sendChangeCompleted(notice: AccountNotice): Promise<boolean> {
  const user = await findOneById(users, notice.userId);
  const message = await accountNoticeMessage(notice);
  if (!user?.formerEmail || !message) return false;
  if (!(await deliver(message))) return false;
  await clearFormerEmail(user.id, user.formerEmail, user.email);
  return true;
}

/**
 * Clears the former address a change-completed notice is owed to, once nothing will try it again: after the run's every attempt
 * failed, or after the one try made when no run started. Does nothing for any other notice.
 */
export async function abandonAccountNotice(notice: AccountNotice): Promise<void> {
  if (notice.kind !== 'change-completed') return;
  const user = await findOneById(users, notice.userId);
  if (user?.formerEmail) await clearFormerEmail(user.id, user.formerEmail, user.email);
}
