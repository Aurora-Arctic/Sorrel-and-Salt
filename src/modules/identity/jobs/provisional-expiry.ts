import { sleep } from '@/lib/jobs/runtime';
import {
  VERIFICATION_LIFETIME_SECONDS,
  expireProvisionalAccount,
} from '../services/provisional-accounts';

/**
 * One run per sign-up: waits out the verification window, then deletes the
 * account if it is still unverified. A resend moves the window, so the step
 * says how long is left and the run sleeps again.
 */
export async function provisionalAccountExpiry(userId: string): Promise<void> {
  'use workflow';
  let left: number | null = VERIFICATION_LIFETIME_SECONDS;
  while (left !== null) {
    await sleep(`${left}s`);
    left = await expireStep(userId);
  }
}

async function expireStep(userId: string): Promise<number | null> {
  'use step';
  return expireProvisionalAccount(userId);
}
