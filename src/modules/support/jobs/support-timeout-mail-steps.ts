'use step';

import { sendSupportTimeoutMail } from '../services/timeout-mail';
import type { SupportTimeoutMail } from '../types';

// The step of the support time-out mail job. A file of its own, so the workflow bundle keeps only the call to it and never the database
// code it reaches.

// The log is how a mail lost after every retry is seen.
/* oxlint-disable no-console */

/** Builds the mail from the rows and sends it; true once the transport took it. A transport failure throws, so the SDK retries the step. */
export async function supportTimeoutStep(mail: SupportTimeoutMail): Promise<boolean> {
  return sendSupportTimeoutMail(mail);
}

/** Logs a mail that failed every attempt, by row id alone. */
export async function reportSupportTimeoutUnsent(mail: SupportTimeoutMail): Promise<void> {
  console.error(
    `mail: every attempt failed; the support time-out mail for time-out ${mail.timeoutId} was not sent`,
  );
}
