'use step';

import { lapseEmailChange } from '../services/email';
import { sendChangeLink, sendSecretLink } from '../services/secret-link-mail';
import type { SecretLink } from '../types';

// The step of the secret-link mail job. A file of its own, so the workflow bundle keeps only the call to it and never the
// database code it reaches.

// The log is how a mail lost after every retry is seen.
/* oxlint-disable no-console */

/** A transport failure throws, so the SDK retries the step. */
export async function secretLinkStep(link: SecretLink): Promise<boolean> {
  return sendSecretLink(link);
}

export async function changeLinkStep(
  link: Extract<SecretLink, { kind: 'change' }>,
): Promise<{ sentAt: string; lapsesInSeconds: number } | null> {
  return sendChangeLink(link);
}

export async function lapseChangeStep(userId: string, sentAt: string): Promise<boolean> {
  return lapseEmailChange(userId, new Date(sentAt));
}

export async function reportSecretLinkUnsent(link: SecretLink): Promise<void> {
  const whom =
    link.kind === 'invitation' ? `for invitation ${link.invitationId}` : `to user ${link.userId}`;
  console.error(`mail: every attempt failed; the ${link.kind} mail ${whom} was not sent`);
}
