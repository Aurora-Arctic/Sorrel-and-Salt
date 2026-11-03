import { reportSupportStatusUnsent, supportStatusStep } from './support-status-mail-steps';
import type { SupportStatusMail } from '../types';

/**
 * One received or resolved mail, built from the request and sent by a step the SDK retries. The run holds `mail`: the request id,
 * the kind and the origin. True once the transport took it; false when there was nothing to send, or when every attempt failed,
 * which is logged.
 */
export async function supportStatusMail(mail: SupportStatusMail): Promise<boolean> {
  'use workflow';
  try {
    return await supportStatusStep(mail);
  } catch {
    await reportSupportStatusUnsent(mail);
    return false;
  }
}
