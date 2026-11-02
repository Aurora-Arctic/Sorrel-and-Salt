import { describe, expect, it, vi } from 'vitest';
import { pauseNotifier } from '@/lib/pause-mail';

// The pause notifier hands the three pause services the request's own origin and nothing else: each service starts a run with
// it, and the run's step builds the link to the support page from it. Sending is the services' tests.

const { send } = vi.hoisted(() => ({ send: vi.fn(async () => {}) }));
vi.mock('@/lib/mail', () => ({ send }));

describe('pauseNotifier', () => {
  it("gives the request's origin, sending nothing itself", async () => {
    const notifier = pauseNotifier(new Request('http://localhost:8000/api/graphql'));

    expect(await notifier.origin()).toBe('http://localhost:8000');
    expect(Object.keys(notifier)).toEqual(['origin']);
    expect(send).not.toHaveBeenCalled();
  });
});
