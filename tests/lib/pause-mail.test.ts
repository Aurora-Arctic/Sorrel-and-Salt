import { describe, expect, it, vi } from 'vitest';
import { pauseNotifier } from '@/lib/pause-mail';
import { ORIGIN } from '../support/constants';
import { send } from '../support/mail';

// The notifier hands the pause services the request's own origin and nothing else; the run's step builds the support link from it.

vi.mock('@/lib/mail', () => import('../support/mail'));

describe('pauseNotifier', () => {
  it("gives the request's origin, sending nothing itself", async () => {
    const notifier = pauseNotifier(new Request(`${ORIGIN}/api/graphql`));

    expect(await notifier.origin()).toBe(ORIGIN);
    expect(Object.keys(notifier)).toEqual(['origin']);
    expect(send).not.toHaveBeenCalled();
  });
});
