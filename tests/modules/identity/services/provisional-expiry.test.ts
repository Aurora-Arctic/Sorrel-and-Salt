import { beforeEach, describe, expect, it, vi } from 'vitest';

const startJob = vi.hoisted(() => vi.fn<(job: unknown, args: unknown[]) => Promise<string>>());
vi.mock('@/lib/jobs', () => ({ startJob }));

const { scheduleProvisionalExpiry } = await import('@/modules/identity');
const { provisionalAccountExpiry } = await import('@/modules/identity/jobs/provisional-expiry');

beforeEach(() => {
  startJob.mockReset();
  startJob.mockResolvedValue('run-1');
});

describe('scheduling the provisional-account expiry', () => {
  it('starts the expiry job for the account and answers its run id', async () => {
    await expect(scheduleProvisionalExpiry('user-1')).resolves.toBe('run-1');

    expect(startJob).toHaveBeenCalledExactlyOnceWith(provisionalAccountExpiry, ['user-1']);
  });
});
