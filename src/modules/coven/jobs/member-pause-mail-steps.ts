'use step';

import { sendMemberPauseMail } from '../services/member-pause-mail';
import type { MemberPauseMail } from '../types';

// The step of the coven access pause mail job. A file of its own, so the workflow bundle keeps only the call to it and never the database
// code it reaches.

// The log is how a mail lost after every retry is seen.
/* oxlint-disable no-console */

/** Builds the mail from the rows and sends it; true once the transport took it. A transport failure throws, so the SDK retries the step. */
export async function memberPauseStep(mail: MemberPauseMail): Promise<boolean> {
  return sendMemberPauseMail(mail);
}

/** Logs a mail that failed every attempt, by row id alone. */
export async function reportMemberPauseUnsent(mail: MemberPauseMail): Promise<void> {
  console.error(
    `mail: every attempt failed; the coven access pause mail for pause ${mail.pauseId} was not sent`,
  );
}
