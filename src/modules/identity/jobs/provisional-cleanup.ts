import { start } from '@/lib/jobs/runtime';
import { CLEANUP_PAGE_SIZE } from './provisional-cleanup-pages';
import { lapsedPageStep } from './provisional-cleanup-steps';
import { provisionalCleanupBatch } from './provisional-cleanup-batch';

/**
 * Never sleeps and starts no successor, as the daily cron starts the next day's run.
 */
export async function provisionalCleanup(): Promise<number> {
  'use workflow';
  let batches = 0;
  let after: string | null = null;
  for (;;) {
    const ids: string[] = await lapsedPageStep(after);
    if (ids.length === 0) break;
    // Recorded as a step, so a replay of the coordinator starts each batch once.
    await start(provisionalCleanupBatch, [ids]);
    batches += 1;
    if (ids.length < CLEANUP_PAGE_SIZE) break;
    after = ids[ids.length - 1] ?? null;
  }
  return batches;
}
