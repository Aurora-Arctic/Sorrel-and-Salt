'use step';

import { sendSecretLink } from '../services/secret-link-mail';
import type { SecretLink } from '../types';

// The step of the secret-link mail job. A file of its own, so the workflow bundle keeps only the call to it and never the
// database code it reaches.

// The log is how a mail lost after every retry is seen.
/* oxlint-disable no-console */

/** Builds the mail for `link` from the rows and sends it; true once the transport took it. A transport failure throws, so the SDK retries the step. */
export async function secretLinkStep(link: SecretLink): Promise<boolean> {
  return sendSecretLink(link);
}

/** Logs a mail that failed every attempt, by kind and account id alone. */
export async function reportSecretLinkUnsent(link: SecretLink): Promise<void> {
  console.error(
    `mail: every attempt failed; the ${link.kind} mail to user ${link.userId} was not sent`,
  );
}
