import { reportMemberPauseUnsent, memberPauseStep } from './member-pause-mail-steps';
import type { MemberPauseMail } from '../types';

/**
 * One coven access pause mail, built from the rows and sent by a step the SDK retries. The run holds `mail`: the row's id, the kind and the
 * origin. True once the transport took it; false when there was nothing to send, or when every attempt failed, which is logged.
 */
export async function memberPauseMail(mail: MemberPauseMail): Promise<boolean> {
  'use workflow';
  try {
    return await memberPauseStep(mail);
  } catch {
    await reportMemberPauseUnsent(mail);
    return false;
  }
}
