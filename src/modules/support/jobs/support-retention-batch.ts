import { reportRetentionBatchFailed, retentionBatchStep } from './support-retention-batch-steps';
import type { RetentionBatch } from '../types';

/**
 * Takes one page of request ids through one retention stage, by a step the SDK retries. Returns how many requests it changed, or
 * null when every attempt failed, which is logged; the requests stay due, so the next day's run takes them again.
 */
export async function supportRetentionBatch(batch: RetentionBatch): Promise<number | null> {
  'use workflow';
  try {
    return await retentionBatchStep(batch);
  } catch {
    await reportRetentionBatchFailed(batch.kind, batch.ids.length);
    return null;
  }
}
