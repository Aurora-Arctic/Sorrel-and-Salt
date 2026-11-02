import 'server-only';
import { startJob } from '../../../lib/jobs';
import { send } from '../../../lib/mail';
import { secretLinkMail } from '../jobs/secret-link-mail';
import { secretLinkMessage } from './secret-link-mail';
import type { SecretLink } from '../types';

// Where a secret-link mail is started, apart from the step's service so the job and the service import no cycle.

// The log is how a mail whose job did not start is seen.
/* oxlint-disable no-console */

/**
 * Sends the mail for `link` through a job whose step the SDK retries, the run carrying `link` alone. Tried once here instead
 * while MAIL_TRANSPORT is unset, which has nothing to retry, or when the run cannot be started. Never throws: a send that
 * fails is logged.
 */
export async function scheduleSecretLinkMail(link: SecretLink): Promise<void> {
  // '' is unset, as Vercel and compose both write an empty variable.
  if (process.env.MAIL_TRANSPORT) {
    try {
      await startJob(secretLinkMail, [link]);
      return;
    } catch (error) {
      console.error(`mail: the ${link.kind} mail job did not start; trying it once`, error);
    }
  }
  const message = await secretLinkMessage(link);
  if (message) await send(message, { carriesSecret: true });
}
