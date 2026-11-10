'use step';

import { sendAccessPauseMail } from '../services/access-pause-mail';
import type { AccessPauseMail } from '../types';

// The step of the site access pause mail job. A file of its own, so the workflow bundle keeps only the call to it and never the database
// code it reaches.

// The log is how a mail lost after every retry is seen.
/* oxlint-disable no-console */

/** A transport failure throws, so the SDK retries the step. */
export async function accessPauseStep(mail: AccessPauseMail): Promise<boolean> {
  return sendAccessPauseMail(mail);
}

export async function reportAccessPauseUnsent(mail: AccessPauseMail): Promise<void> {
  console.error(
    `mail: every attempt failed; the access pause mail for pause ${mail.pauseId} was not sent`,
  );
}
