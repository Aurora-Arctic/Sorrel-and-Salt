import { reportAccountNoticeUnsent, accountNoticeStep } from './account-notice-mail-steps';
import type { AccountNotice } from '../types';

/**
 * The run holds `notice`, ids alone. False when there was nothing to send, or when every attempt failed, which is logged.
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
