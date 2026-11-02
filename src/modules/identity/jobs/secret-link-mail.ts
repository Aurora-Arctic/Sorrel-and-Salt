import { reportSecretLinkUnsent, secretLinkStep } from './secret-link-mail-steps';
import type { SecretLink } from '../types';

/**
 * One secret-link mail, built from the rows and sent by a step the SDK retries. The run holds `link`, ids alone, so the job's
 * event log never holds a token. True once the transport took it; false when there was nothing to send, or when every attempt
 * failed, which is logged.
 */
export async function secretLinkMail(link: SecretLink): Promise<boolean> {
  'use workflow';
  try {
    return await secretLinkStep(link);
  } catch {
    await reportSecretLinkUnsent(link);
    return false;
  }
}
