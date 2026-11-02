import { reportAccountNoticeUnsent, accountNoticeStep } from './account-notice-mail-steps';
import type { AccountNotice } from '../types';

/**
 * One account notice, built from the rows and sent by a step the SDK retries. The run holds `notice`, ids alone. True once the
 * transport took it; false when there was nothing to send, or when every attempt failed, which is logged.
 */
export async function accountNoticeMail(notice: AccountNotice): Promise<boolean> {
  'use workflow';
  try {
    return await accountNoticeStep(notice);
  } catch {
    await reportAccountNoticeUnsent(notice);
    return false;
  }
}
