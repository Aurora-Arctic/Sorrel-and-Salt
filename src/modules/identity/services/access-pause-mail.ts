import 'server-only';
import { findOneById } from '../../../db/repository';
import { deliver } from '../../../lib/mail-transport';
import { accessPauseNotice } from '../../../lib/pause-job-mail';
import { userAccessPauses } from '../schema/user-access-pauses';
import { users } from '../schema/users';
import type { Message } from '../../../lib/types';
import type { AccessPauseMail } from '../types';

// The site access pause mail, built from the rows when it is sent, so the job that retries it carries ids alone.

/** The mail for `mail` as the rows stand, or null when there is none to send: the pause is gone or lifted, or its user has left. */
export async function accessPauseMessageFor(mail: AccessPauseMail): Promise<Message | null> {
  const pause = await findOneById(userAccessPauses, mail.pauseId);
  if (!pause || pause.liftedAt) return null;
  const user = await findOneById(users, pause.userId);
  if (!user) return null;
  return accessPauseNotice(mail.origin, user.email, pause);
}

/** Builds and sends `mail`; true once the transport took it, false when there was none to send. A transport failure throws, so a job's step is retried. */
export async function sendAccessPauseMail(mail: AccessPauseMail): Promise<boolean> {
  const message = await accessPauseMessageFor(mail);
  if (!message) return false;
  return deliver(message);
}
