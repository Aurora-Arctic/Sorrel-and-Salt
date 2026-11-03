import 'server-only';
import { send } from '../../../lib/mail';
import { startMailJob } from '../../../lib/mail-job';
import { secretLinkMail } from '../jobs/secret-link-mail';
import { secretLinkMessage } from './secret-link-mail';
import type { SecretLink } from '../types';

// Where a secret-link mail is started, apart from the step's service so the job and the service import no cycle.

/**
 * Sends the mail for `link` through a job whose step the SDK retries, the run carrying `link` alone. Tried once here instead
 * while MAIL_TRANSPORT is unset, or when the run cannot be started. Never throws: a send that fails is logged.
 */
export async function scheduleSecretLinkMail(link: SecretLink): Promise<void> {
  await startMailJob(secretLinkMail, [link], link.kind, async () => {
    const message = await secretLinkMessage(link);
    if (message) await send(message);
  });
}
