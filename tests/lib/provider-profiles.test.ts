import { describe, expect, it } from 'vitest';
// The record itself, as tests/lib/social-providers-config.test.ts reads the module.
// oxlint-disable-next-line no-restricted-imports
import { PROFILE } from '@/lib/social-providers-config';
import { SOCIAL_PROVIDERS } from '@/lib/social-providers';

// `PROFILE` replaced a switch over the roster with no default, under which a
// provider added to `ProviderId` compiled and never registered: a provider on
// the roster with no profile fails here.
describe('PROFILE', () => {
  it('holds an entry for exactly the roster', () => {
    expect(Object.keys(PROFILE).sort()).toEqual(SOCIAL_PROVIDERS.map(({ id }) => id).sort());
  });
});
