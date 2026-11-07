import { reportAccessPauseUnsent, accessPauseStep } from './access-pause-mail-steps';
import type { AccessPauseMail } from '../types';

/**
 * The run holds `mail`: the row's id, the kind and the origin. False when there was nothing to send, or when every attempt failed, which is logged.
 */
export async function accessPauseMail(mail: AccessPauseMail): Promise<boolean> {
  'use workflow';
  try {
    return await accessPauseStep(mail);
  } catch {
    await reportAccessPauseUnsent(mail);
    return false;
  }
}
