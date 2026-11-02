import { reportSupportTimeoutUnsent, supportTimeoutStep } from './support-timeout-mail-steps';
import type { SupportTimeoutMail } from '../types';

/**
 * One support time-out mail, built from the rows and sent by a step the SDK retries. The run holds `mail`: the row's id, the kind and the
 * origin. True once the transport took it; false when there was nothing to send, or when every attempt failed, which is logged.
 */
export async function supportTimeoutMail(mail: SupportTimeoutMail): Promise<boolean> {
  'use workflow';
  try {
    return await supportTimeoutStep(mail);
  } catch {
    await reportSupportTimeoutUnsent(mail);
    return false;
  }
}
