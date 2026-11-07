'use step';

import { sendMemberPauseMail } from '../services/member-pause-mail';
import type { MemberPauseMail } from '../types';

// A file of its own, so the workflow bundle never holds the database code it reaches.

// The log is how a mail lost after every retry is seen.
/* oxlint-disable no-console */

/** A transport failure throws, so the SDK retries the step. */
export async function memberPauseStep(mail: MemberPauseMail): Promise<boolean> {
  return sendMemberPauseMail(mail);
}

export async function reportMemberPauseUnsent(mail: MemberPauseMail): Promise<void> {
  console.error(
    `mail: every attempt failed; the coven access pause mail for pause ${mail.pauseId} was not sent`,
  );
}
