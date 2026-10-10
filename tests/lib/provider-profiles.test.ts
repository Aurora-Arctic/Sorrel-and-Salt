import { describe, expect, expectTypeOf, it } from 'vitest';
// The record itself, as tests/lib/social-providers-config.test.ts reads the module.
// oxlint-disable-next-line no-restricted-imports
import { PROFILE } from '@/lib/social-providers-config';
import { SOCIAL_PROVIDERS } from '@/lib/social-providers';
import type { ProviderId, ProviderProfiles } from '@/lib/types';

// `PROFILE` replaced a switch over the roster with no default, under which a
// provider added to `ProviderId` compiled and never registered. The two type
// assertions are what `npm run typecheck` checks: together they say a fifth
// id with no entry fails to compile.
describe('PROFILE', () => {
  it('is declared as one required entry per ProviderId', () => {
    // Loosened to a Partial or a Record<string, …>, it would accept a missing entry.
    expectTypeOf(PROFILE).toEqualTypeOf<ProviderProfiles<ProviderId>>();
  });

  it('would not compile with a fifth ProviderId that has no entry', () => {
    // What PROFILE's own declaration meets once 'apple' joins ProviderId. With
    // the mapped type's keys made optional, this line compiles and the unused
    // directive fails typecheck instead.
    // @ts-expect-error 'apple' has no entry, and every id needs one.
    const withFifth: ProviderProfiles<ProviderId | 'apple'> = PROFILE;

    expect(withFifth).toBe(PROFILE);
  });

  it('holds an entry for exactly the roster', () => {
    expect(Object.keys(PROFILE).sort()).toEqual(SOCIAL_PROVIDERS.map(({ id }) => id).sort());
  });
});
