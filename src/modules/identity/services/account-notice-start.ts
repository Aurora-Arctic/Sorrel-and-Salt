import 'server-only';
import { send } from '../../../lib/mail';
import { startMailJob } from '../../../lib/mail-job';
import { accountNoticeMail } from '../jobs/account-notice-mail';
import { abandonAccountNotice, accountNoticeMessage } from './account-notice-mail';
import type { AccountNotice } from '../types';

// Where an account notice is started, apart from the step's service so the job and the service import no cycle.

/**
 * Tried once here while MAIL_TRANSPORT is unset, or when the run cannot be started. Never throws: a send that fails is logged.
 */
export async function scheduleAccountNotice(notice: AccountNotice): Promise<void> {
  await startMailJob(accountNoticeMail, [notice], notice.kind, async () => {
    const message = await accountNoticeMessage(notice);
    if (message) await send(message);
    await abandonAccountNotice(notice);
  });
}
