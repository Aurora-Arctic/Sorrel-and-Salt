import 'server-only';
import { send } from '../../../lib/mail';
import { startMailJob } from '../../../lib/mail-job';
import { memberPauseMail } from '../jobs/member-pause-mail';
import { memberPauseMessageFor } from './member-pause-mail';
import type { MemberPauseMail } from '../types';

// Where the coven access pause mail starts, apart from the step's service so the job and the service import no cycle.

/**
 * Mails the member of a pause through a job whose run carries the pause's id, the kind and the origin; its step reads the address,
 * the coven's name and the message when it sends. Tried once here instead while MAIL_TRANSPORT is unset, or when the run cannot
 * be started. The pause is already saved, so a lost mail loses nothing, and this never throws.
 */
export async function mailPausedMember(pauseId: string, origin: string): Promise<void> {
  const mail: MemberPauseMail = { kind: 'member-pause', pauseId, origin };
  await startMailJob(memberPauseMail, [mail], 'coven access pause', async () => {
    const message = await memberPauseMessageFor(mail);
    if (message) await send(message);
  });
}
