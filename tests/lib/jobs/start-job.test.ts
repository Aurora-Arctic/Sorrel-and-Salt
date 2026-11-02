import { beforeEach, describe, expect, it, vi } from 'vitest';
import { startJob } from '@/lib/jobs';
import { RunArgumentRefused } from '@/lib/jobs/run-arguments';

// startJob is the one door to the SDK (tests/guards/lint-job-boundary.test.ts), so the run-argument allow-list it applies covers
// every job the site starts.

const start = vi.hoisted(() => vi.fn(async (..._args: unknown[]) => ({ runId: 'run-1' })));
vi.mock('workflow/api', () => ({ start, getHookByToken: vi.fn() }));

const job = async (..._args: unknown[]) => true;
const ID = '0b6f3c1e-8f3a-4d6e-9a43-3d7f4d2a9c11';

beforeEach(() => {
  start.mockClear();
});

describe('startJob', () => {
  it('starts a run whose arguments are ids and an origin', async () => {
    expect(
      await startJob(job, [{ kind: 'received', requestId: ID, origin: 'https://a.example' }]),
    ).toBe('run-1');
    expect(start).toHaveBeenCalledTimes(1);
  });

  it('refuses a run holding an address before the SDK is called', async () => {
    await expect(
      startJob(job, [{ kind: 'received', requestId: ID, to: 'reader@example.test' }]),
    ).rejects.toThrow(RunArgumentRefused);
    expect(start).not.toHaveBeenCalled();
  });
});
