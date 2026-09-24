import { describe, expect, it } from 'vitest';
import { SOCIAL_PROVIDERS } from '@/lib/social-providers';

// Id/label only — no env var names anywhere in this module, since SignInPanel
// ('use client') imports it directly. Env var mapping and configuredProviders()
// live in social-providers-config.ts (tests/lib/social-providers-config.test.ts),
// which nothing client-side may import.
describe('SOCIAL_PROVIDERS roster', () => {
  it('names exactly the four v1 providers, in display order', () => {
    expect(SOCIAL_PROVIDERS.map((provider) => provider.id)).toEqual([
      'discord',
      'google',
      'facebook',
      'microsoft',
    ]);
  });

  it('gives every provider a human label distinct from its id', () => {
    for (const provider of SOCIAL_PROVIDERS) {
      expect(provider.label.length).toBeGreaterThan(0);
    }
  });

  it('carries no env var names — those live only in social-providers-config.ts', () => {
    for (const provider of SOCIAL_PROVIDERS) {
      expect(Object.keys(provider).sort()).toEqual(['id', 'label']);
    }
  });
});
