import 'server-only';
import { startMessageMail } from '../../../lib/mail-job';
import { supportTimeoutMail } from '../jobs/support-timeout-mail';
import { supportTimeoutMessageFor } from './timeout-mail';
import type { SupportTimeoutMail } from '../types';

// Where the support time-out mail starts, apart from the step's service so the job and the service import no cycle.

/**
 * Mails the user of a time-out through a job whose run carries the time-out's id, the kind and the origin; its step reads the
 * address and the message when it sends. Tried once here instead while MAIL_TRANSPORT is unset, or when the run cannot be
 * started. The time-out is already saved, so a lost mail loses nothing, and this never throws.
 */
export async function mailTimedOutSender(timeoutId: string, origin: string): Promise<void> {
  const mail: SupportTimeoutMail = { kind: 'support-time-out', timeoutId, origin };
  await startMessageMail(supportTimeoutMail, mail, 'support time-out', supportTimeoutMessageFor);
}
