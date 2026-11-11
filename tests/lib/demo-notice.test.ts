import { describe, expect, it } from 'vitest';
import { DEMO_NOTICE, DEMO_OWNER_NOTICE, demoNoticeOf } from '@/lib/demo-notice';

// Which notice a coven page shows: none outside the demo coven, and in it one for its stewards and one for everyone else.

describe('demoNoticeOf', () => {
  it.each(['owner', 'member', 'viewer'] as const)(
    'shows no notice to a %s of a coven that is not the demo',
    (role) => {
      expect(demoNoticeOf({ demo: false }, role)).toBeUndefined();
    },
  );

  it('tells a steward of the demo coven that what they change is what every new account sees', () => {
    expect(demoNoticeOf({ demo: true }, 'owner')).toBe(DEMO_OWNER_NOTICE);
  });

  it.each(['member', 'viewer'] as const)('tells a %s of the demo coven it is a demo', (role) => {
    expect(demoNoticeOf({ demo: true }, role)).toBe(DEMO_NOTICE);
  });
});
