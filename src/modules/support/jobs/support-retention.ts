import { pageLoop } from '@/lib/jobs/page-loop';
import { start } from '@/lib/jobs/runtime';
import { RETENTION_PAGE_SIZE, RETENTION_STAGES } from './support-retention-pages';
import { retentionDueStep } from './support-retention-steps';
import { supportRetentionBatch } from './support-retention-batch';

/**
 * One day's support retention as of `now` (milliseconds), with notices linked from `origin`: for each stage in turn it reads the
 * ids due a page at a time and starts a batch run for each page, then ends. It never sleeps and starts no successor, as the
 * daily cron starts the next day's run. Returns how many batches it started.
 */
export async function supportRetention(now: number, origin: string): Promise<number> {
  'use workflow';
  let batches = 0;
  for (const kind of RETENTION_STAGES) {
    batches += await pageLoop(
      RETENTION_PAGE_SIZE,
      (after) => retentionDueStep(kind, now, after),
      // Each batch start is recorded as a step, so a replay of the coordinator starts it once.
      (ids) => start(supportRetentionBatch, [{ kind, ids, now, origin }]),
    );
  }
  return batches;
}
