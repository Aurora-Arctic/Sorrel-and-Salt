import 'server-only';
import { startMessageMail } from '../../../lib/mail-job';
import { secretLinkMail } from '../jobs/secret-link-mail';
import { secretLinkMessage } from './secret-link-mail';
import type { SecretLink } from '../types';

// Where a secret-link mail is started, apart from the step's service so the job and the service import no cycle.

/**
 * Tried once here while MAIL_TRANSPORT is unset, or when the run cannot be started. Never throws: a send that fails is logged.
 */
export async function scheduleSecretLinkMail(link: SecretLink): Promise<void> {
  await startMessageMail(secretLinkMail, link, link.kind, secretLinkMessage);
}
