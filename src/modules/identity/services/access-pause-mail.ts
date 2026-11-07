import 'server-only';
import { findOneById } from '../../../db/repository';
import { deliver } from '../../../lib/mail-transport';
import { accessPauseNotice } from '../../../lib/pause-job-mail';
import { userAccessPauses } from '../schema/user-access-pauses';
import { users } from '../schema/users';
import type { Message } from '../../../lib/types';
import type { AccessPauseMail } from '../types';

// The site access pause mail, built from the rows when it is sent, so the job that retries it carries ids alone.

export async function accessPauseMessageFor(mail: AccessPauseMail): Promise<Message | null> {
  const pause = await findOneById(userAccessPauses, mail.pauseId);
  if (!pause || pause.liftedAt) return null;
  const user = await findOneById(users, pause.userId);
  if (!user) return null;
  return accessPauseNotice(mail.origin, user.email, pause);
}

/** A transport failure throws, so a job's step is retried. */
export async function sendAccessPauseMail(mail: AccessPauseMail): Promise<boolean> {
  const message = await accessPauseMessageFor(mail);
  if (!message) return false;
  return deliver(message);
}
