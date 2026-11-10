import 'server-only';
import { startMessageMail } from '../../../lib/mail-job';
import { accessPauseMail } from '../jobs/access-pause-mail';
import { accessPauseMessageFor } from './access-pause-mail';
import type { AccessPauseMail } from '../types';

// Where the site access pause mail starts, apart from the step's service so the job and the service import no cycle.

/**
 * Tried once here while MAIL_TRANSPORT is unset, or when the run cannot be started. Never throws: the pause is already saved, so a lost mail loses nothing.
 */
export async function mailPausedUser(pauseId: string, origin: string): Promise<void> {
  const mail: AccessPauseMail = { kind: 'access-pause', pauseId, origin };
  await startMessageMail(accessPauseMail, mail, 'access pause', accessPauseMessageFor);
}
