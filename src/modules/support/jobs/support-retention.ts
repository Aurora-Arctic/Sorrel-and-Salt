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
    let after: string | null = null;
    for (;;) {
      const ids: string[] = await retentionDueStep(kind, now, after);
      if (ids.length === 0) break;
      // Recorded as a step, so a replay of the coordinator starts each batch once.
      await start(supportRetentionBatch, [{ kind, ids, now, origin }]);
      batches += 1;
      if (ids.length < RETENTION_PAGE_SIZE) break;
      after = ids[ids.length - 1] ?? null;
    }
  }
  return batches;
}
