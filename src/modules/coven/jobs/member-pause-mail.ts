import { reportMemberPauseUnsent, memberPauseStep } from './member-pause-mail-steps';
import type { MemberPauseMail } from '../types';

/** False when there was nothing to send or every attempt failed (logged). */
export async function memberPauseMail(mail: MemberPauseMail): Promise<boolean> {
  'use workflow';
  try {
    return await memberPauseStep(mail);
  } catch {
    await reportMemberPauseUnsent(mail);
    return false;
  }
}
