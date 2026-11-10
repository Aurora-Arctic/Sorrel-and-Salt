import 'server-only';
import { findOneById } from '../../../db/repository';
import { deliverMessageFor } from '../../../lib/deliver-message-for';
import { supportStatusMessage } from '../../../lib/support-job-mail';
import { SYSTEM_ACTOR_ID } from '../../../lib/system-actor';
import { supportRequests } from '../schema/support-requests';
import { supportRecipientFor } from './recipient';
import type { Message } from '../../../lib/types';
import type { SupportStatusMail } from '../types';

// The received and resolved mails, built from the request when they are sent, so the job that retries one carries ids alone.

/**
 * The mail for `mail` as the request stands, or null when there is none to send: the request is gone or anonymised, its sender
 * has left, or a resolved mail's request is no longer resolved. To the address a signed-out sender gave, or the account's own.
 */
export async function supportStatusMessageFor(mail: SupportStatusMail): Promise<Message | null> {
  const request = await findOneById(supportRequests, mail.requestId);
  if (!request || request.createdBy === SYSTEM_ACTOR_ID) return null;
  if (mail.kind === 'resolved' && request.status !== 'resolved') return null;
  const recipient = await supportRecipientFor(request);
  if (!recipient) return null;
  return supportStatusMessage(
    mail.kind,
    mail.origin,
    recipient.to,
    request.subject,
    recipient.signedOut ? null : request.id,
    recipient.viewToken,
  );
}

/** Builds and sends `mail`; true once the transport took it, false when there was none to send. A transport failure throws, so a job's step is retried. */
export async function sendSupportStatusMail(mail: SupportStatusMail): Promise<boolean> {
  return deliverMessageFor(supportStatusMessageFor, mail);
}
