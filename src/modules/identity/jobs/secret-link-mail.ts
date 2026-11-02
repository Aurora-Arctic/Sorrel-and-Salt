import { sleep } from '@/lib/jobs/runtime';
import {
  changeLinkStep,
  lapseChangeStep,
  reportSecretLinkUnsent,
  secretLinkStep,
} from './secret-link-mail-steps';
import type { SecretLink } from '../types';

/**
 * One secret-link mail, built from the rows and sent by a step the SDK retries. The run holds `link`, ids alone, so the job's
 * event log never holds a token. A change link's run then waits out the link and clears the pending address it was sent for.
 * True once the transport took the mail; false when there was nothing to send, or when every attempt failed, which is logged.
 */
export async function secretLinkMail(link: SecretLink): Promise<boolean> {
  'use workflow';
  let sent: Awaited<ReturnType<typeof changeLinkStep>>;
  try {
    if (link.kind !== 'change') return await secretLinkStep(link);
    sent = await changeLinkStep(link);
  } catch {
    await reportSecretLinkUnsent(link);
    return false;
  }
  if (!sent) return false;
  await sleep(`${sent.lapsesInSeconds}s`);
  await lapseChangeStep(link.userId, sent.sentAt);
  return true;
}
