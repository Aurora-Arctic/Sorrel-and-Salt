import { createHook, sleep } from '@/lib/jobs/runtime';
import type { Message } from '@/lib/types';
import { advanceStep, closingNoticeStep } from './support-lifecycle-steps';

/**
 * One run per request, started when it is resolved or closed: sends the closing-soon notice on day 5, closes it on day 7 and
 * anonymises it twelve months after the close, re-reading the row before each. It holds a hook token named for the request, so
 * a second start while a run is waiting ends at once and the waiting run, which re-reads, takes up the new resolution. A notice
 * that fails every retry is given up for that resolution rather than holding back the close. The notice comes rendered, as a
 * step that rendered mail would bring the JSX templates into the step bundle; null for a request closed by staff.
 */
export async function supportRequestLifecycle(
  requestId: string,
  notice: Message | null,
): Promise<'duplicate' | 'done'> {
  'use workflow';
  using owner = createHook({ token: `support-request:${requestId}` });
  if (await owner.getConflict()) return 'duplicate';
  let noticeSkippedFor: number | null = null;
  for (;;) {
    const next = await advanceStep(requestId, noticeSkippedFor);
    if (next.kind === 'done') return 'done';
    if (next.kind === 'wait') {
      await sleep(`${next.seconds}s`);
      continue;
    }
    let sent = false;
    if (notice !== null) {
      try {
        sent = await closingNoticeStep(requestId, notice);
      } catch {
        // The step's own retries are spent and the transport logged each failure.
        sent = false;
      }
    }
    if (!sent) noticeSkippedFor = next.resolvedAt;
  }
}
