import { beforeEach, describe, expect, it, vi } from 'vitest';

const startJob = vi.hoisted(() => vi.fn<(job: unknown, args: unknown[]) => Promise<string>>());
const jobTokenActive = vi.hoisted(() => vi.fn<(token: string) => Promise<boolean>>());
vi.mock('@/lib/jobs', () => ({ startJob, jobTokenActive }));

const { ensureProvisionalCleanup } = await import('@/modules/identity');
const { provisionalCleanup } = await import('@/modules/identity/jobs/provisional-cleanup');
const { PROVISIONAL_CLEANUP_TOKEN } =
  await import('@/modules/identity/jobs/provisional-cleanup-token');

let logged: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  startJob.mockReset();
  jobTokenActive.mockReset();
  startJob.mockResolvedValue('run-1');
  logged = vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('ensuring the daily provisional cleanup runs', () => {
  it('starts it when no run holds the token', async () => {
    jobTokenActive.mockResolvedValue(false);

    await expect(ensureProvisionalCleanup()).resolves.toBe('run-1');

    expect(jobTokenActive).toHaveBeenCalledWith(PROVISIONAL_CLEANUP_TOKEN);
    expect(startJob).toHaveBeenCalledExactlyOnceWith(provisionalCleanup, []);
  });

  it('starts nothing when a run holds the token', async () => {
    jobTokenActive.mockResolvedValue(true);

    await expect(ensureProvisionalCleanup()).resolves.toBeNull();

    expect(startJob).not.toHaveBeenCalled();
  });

  it('logs a failed start and answers null rather than throwing', async () => {
    jobTokenActive.mockResolvedValue(false);
    startJob.mockRejectedValue(new Error('queue down'));

    await expect(ensureProvisionalCleanup()).resolves.toBeNull();

    expect(logged).toHaveBeenCalled();
  });
});
