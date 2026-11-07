import { sleep } from '@/lib/jobs/runtime';
import { expireStep, firstLookDelay } from './provisional-expiry-steps';

/**
 * A resend moves the window, so the step says how long is left and the run sleeps again.
 */
export async function provisionalAccountExpiry(userId: string): Promise<void> {
  'use workflow';
  let left: number | null = await firstLookDelay();
  while (left !== null) {
    await sleep(`${left}s`);
    left = await expireStep(userId);
  }
}
