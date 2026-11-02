import 'server-only';
import { findOneById } from '../../../db/repository';
import { deliver } from '../../../lib/mail-transport';
import { supportTimeoutNotice } from '../../../lib/pause-job-mail';
import { users } from '../../identity/schema/users';
import { supportTimeouts } from '../schema/support-timeouts';
import type { Message } from '../../../lib/types';
import type { SupportTimeoutMail } from '../types';

// The support time-out mail, built from the rows when it is sent, so the job that retries it carries ids alone.

/** The mail for `mail` as the rows stand, or null when there is none to send: the time-out is gone or lifted, or its user has left. */
export async function supportTimeoutMessageFor(mail: SupportTimeoutMail): Promise<Message | null> {
  const timeout = await findOneById(supportTimeouts, mail.timeoutId);
  if (!timeout || timeout.liftedAt) return null;
  const user = await findOneById(users, timeout.userId);
  if (!user) return null;
  return supportTimeoutNotice(mail.origin, user.email, timeout);
}

/** Builds and sends `mail`; true once the transport took it, false when there was none to send. A transport failure throws, so a job's step is retried. */
export async function sendSupportTimeoutMail(mail: SupportTimeoutMail): Promise<boolean> {
  const message = await supportTimeoutMessageFor(mail);
  if (!message) return false;
  return deliver(message);
}
