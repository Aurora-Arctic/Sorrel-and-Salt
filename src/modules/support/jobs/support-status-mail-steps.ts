'use step';

import { sendSupportStatusMail } from '../services/status-mail';
import type { SupportStatusMail } from '../types';

// The step of the received and resolved mail job. A file of its own, so the workflow bundle keeps only the call to it and never
// the database code it reaches.

// The log is how a mail lost after every retry is seen.
/* oxlint-disable no-console */

/** Builds the mail from the request and sends it; true once the transport took it. A transport failure throws, so the SDK retries the step. */
export async function supportStatusStep(mail: SupportStatusMail): Promise<boolean> {
  return sendSupportStatusMail(mail);
}

/** Logs a mail that failed every attempt, by kind and request id alone. */
export async function reportSupportStatusUnsent(mail: SupportStatusMail): Promise<void> {
  console.error(
    `support: every attempt failed; the ${mail.kind} mail for request ${mail.requestId} was not sent`,
  );
}
