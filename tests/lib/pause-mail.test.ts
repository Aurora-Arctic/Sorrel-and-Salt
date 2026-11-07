import { describe, expect, it, vi } from 'vitest';
import { pauseNotifier } from '@/lib/pause-mail';

// The notifier hands the pause services the request's own origin and nothing else; the run's step builds the support link from it.

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
