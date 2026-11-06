import { beforeEach, describe, expect, it, vi } from 'vitest';

const startJob = vi.hoisted(() => vi.fn<(job: unknown, args: unknown[]) => Promise<string>>());
vi.mock('@/lib/jobs', () => ({ startJob }));

const { startProvisionalCleanup } = await import('@/modules/identity');
const { provisionalCleanup } = await import('@/modules/identity/jobs/provisional-cleanup');

beforeEach(() => {
  startJob.mockReset();
  startJob.mockResolvedValue('run-1');
});

describe('starting the daily provisional cleanup', () => {
  it('starts one coordinator run with no arguments and returns its id', async () => {
    await expect(startProvisionalCleanup()).resolves.toBe('run-1');

    expect(startJob).toHaveBeenCalledExactlyOnceWith(provisionalCleanup, []);
  });

  it('lets a failed start throw, so the cron call answers with an error and Vercel shows it', async () => {
    startJob.mockRejectedValue(new Error('queue down'));

    await expect(startProvisionalCleanup()).rejects.toThrow('queue down');
  });
});
