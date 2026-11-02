import { cleanupBatchStep, reportCleanupBatchFailed } from './provisional-cleanup-batch-steps';

/**
 * Deletes one page of lapsed provisional accounts, by a step the SDK retries. Returns how many went, or null when every attempt
 * failed, which is logged; the accounts stay lapsed, so the next day's run takes them again.
 */
export async function provisionalCleanupBatch(ids: string[]): Promise<number | null> {
  'use workflow';
  try {
    return await cleanupBatchStep(ids);
  } catch {
    await reportCleanupBatchFailed(ids.length);
    return null;
  }
}
