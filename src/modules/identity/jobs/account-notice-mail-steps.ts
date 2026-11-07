'use step';

import { abandonAccountNotice, sendAccountNotice } from '../services/account-notice-mail';
import type { AccountNotice } from '../types';

// The step of the account notice job. A file of its own, so the workflow bundle keeps only the call to it and never the
// database code it reaches.

// The log is how a mail lost after every retry is seen.
/* oxlint-disable no-console */

/** A transport failure throws, so the SDK retries the step. */
export async function accountNoticeStep(notice: AccountNotice): Promise<boolean> {
  return sendAccountNotice(notice);
}

export async function reportAccountNoticeUnsent(notice: AccountNotice): Promise<void> {
  console.error(
    `mail: every attempt failed; the ${notice.kind} mail to user ${notice.userId} was not sent`,
  );
  await abandonAccountNotice(notice);
}
