import { createHook, sleep, start } from '@/lib/jobs/runtime';
import { MAILING_BATCH_PAUSE_SECONDS, documentMailingHookToken } from '../mailing-pace';
import { mailBatchStep, nextMailingStep, reportMailingUnsent } from './document-mailing-steps';

/** How a run ended: `sent` all of it, `replaced` by a newer mailing, `paused` on the monthly quota, `tomorrow` for the day, `queued` behind an older mailing, `duplicate` of a run still going, or `failed` every attempt. */
export type DocumentMailingResult =
  'sent' | 'replaced' | 'paused' | 'tomorrow' | 'queued' | 'duplicate' | 'failed';

/**
 * Emails a published document to every account on one mailing, a batch at a time
 * within the day's allowance. It holds the mailing's hook, so a second run ends at
 * once as a duplicate; when a run ends it starts the longest-waiting queued mailing
 * (claude-docs/components/document-mailing-panel.md, "Contracts").
 */
export async function documentMailing(
  mailingId: string,
  origin: string,
): Promise<DocumentMailingResult> {
  'use workflow';
  using claim = createHook({ token: documentMailingHookToken(mailingId) });
  if (await claim.getConflict()) return 'duplicate';

  let result: DocumentMailingResult;
  try {
    for (;;) {
      const batch = await mailBatchStep(mailingId, origin);
      if (batch !== 'more') {
        result = batch;
        break;
      }
      await sleep(`${MAILING_BATCH_PAUSE_SECONDS}s`);
    }
  } catch {
    await reportMailingUnsent(mailingId);
    return 'failed';
  }

  if (result === 'sent' || result === 'replaced' || result === 'paused') {
    const next = await nextMailingStep(mailingId);
    if (next) await start(documentMailing, [next, origin]);
  }
  return result;
}
