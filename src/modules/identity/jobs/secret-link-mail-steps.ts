'use step';

import { lapseEmailChange } from '../services/email';
import { sendChangeLink, sendSecretLink } from '../services/secret-link-mail';
import type { SecretLink } from '../types';

// The step of the secret-link mail job. A file of its own, so the workflow bundle keeps only the call to it and never the
// database code it reaches.

// The log is how a mail lost after every retry is seen.
/* oxlint-disable no-console */

/** Builds the mail for `link` from the rows and sends it; true once the transport took it. A transport failure throws, so the SDK retries the step. */
export async function secretLinkStep(link: SecretLink): Promise<boolean> {
  return sendSecretLink(link);
}

/** Sends the change link for `link`; when it went, the stamp it went under and how long until it lapses. */
export async function changeLinkStep(
  link: Extract<SecretLink, { kind: 'change' }>,
): Promise<{ sentAt: string; lapsesInSeconds: number } | null> {
  return sendChangeLink(link);
}

/** Clears account `userId`'s pending address if the row is still stamped `sentAt`, the change whose link has now expired. */
export async function lapseChangeStep(userId: string, sentAt: string): Promise<boolean> {
  return lapseEmailChange(userId, new Date(sentAt));
}

/** Logs a mail that failed every attempt, by kind and account id alone. */
export async function reportSecretLinkUnsent(link: SecretLink): Promise<void> {
  console.error(
    `mail: every attempt failed; the ${link.kind} mail to user ${link.userId} was not sent`,
  );
}
