import { describe, expect, it } from 'vitest';
import { SOCIAL_PROVIDERS } from '@/lib/social-providers';

// Id/label only, since SignInPanel ('use client') imports it directly. Env var
// mapping and configuredProviders() live in social-providers-config.ts
// (tests/lib/social-providers-config.test.ts), which nothing client-side may
// import.
describe('SOCIAL_PROVIDERS roster', () => {
  it('names exactly the four v1 providers, in display order', () => {
    expect(SOCIAL_PROVIDERS.map((provider) => provider.id)).toEqual([
      'discord',
      'google',
      'facebook',
      'microsoft',
    ]);
  });
});
