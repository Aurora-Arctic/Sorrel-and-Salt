import 'server-only';
import { send } from '../../../lib/mail';
import { startMailJob } from '../../../lib/mail-job';
import { accessPauseMail } from '../jobs/access-pause-mail';
import { accessPauseMessageFor } from './access-pause-mail';
import type { AccessPauseMail } from '../types';

// Where the site access pause mail starts, apart from the step's service so the job and the service import no cycle.

/**
 * Mails the user of a pause through a job whose run carries the pause's id, the kind and the origin; its step reads the address
 * and the message when it sends. Tried once here instead while MAIL_TRANSPORT is unset, or when the run cannot be started. The
 * pause is already saved, so a lost mail loses nothing, and this never throws.
 */
export async function mailPausedUser(pauseId: string, origin: string): Promise<void> {
  const mail: AccessPauseMail = { kind: 'access-pause', pauseId, origin };
  await startMailJob(accessPauseMail, [mail], 'access pause', async () => {
    const message = await accessPauseMessageFor(mail);
    if (message) await send(message);
  });
}
