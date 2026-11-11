import { pageLoop } from '@/lib/jobs/page-loop';
import { start } from '@/lib/jobs/runtime';
import { CLEANUP_PAGE_SIZE } from './provisional-cleanup-pages';
import { lapsedPageStep } from './provisional-cleanup-steps';
import { provisionalCleanupBatch } from './provisional-cleanup-batch';

/**
 * Never sleeps and starts no successor, as the daily cron starts the next day's run.
 */
export async function provisionalCleanup(): Promise<number> {
  'use workflow';
  // Each batch start is recorded as a step, so a replay of the coordinator starts it once.
  return pageLoop(
    CLEANUP_PAGE_SIZE,
    (after) => lapsedPageStep(after),
    (ids) => start(provisionalCleanupBatch, [ids]),
  );
}
