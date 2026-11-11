import 'server-only';
import { startMessageMail } from '../../../lib/mail-job';
import { supportStatusMail } from '../jobs/support-status-mail';
import { supportStatusMessageFor } from './status-mail';
import type { SupportNotifier, SupportRequestRow, SupportStatusMail } from '../types';

// Where the received and resolved mails start, apart from the step's service so the job and the service import no cycle.

/**
 * Mails a request's sender one of the status mails, through a job whose run carries the request id, the kind and the origin; its
 * step reads the address and the subject when it sends. Tried once here instead while MAIL_TRANSPORT is unset, or when the run
 * cannot be started. The request is already saved, so a lost mail loses nothing.
 */
export async function mailSender(
  notifier: SupportNotifier,
  request: SupportRequestRow,
  kind: SupportStatusMail['kind'],
): Promise<void> {
  const mail: SupportStatusMail = { kind, requestId: request.id, origin: await notifier.origin() };
  await startMessageMail(supportStatusMail, mail, `support ${kind}`, supportStatusMessageFor);
}
