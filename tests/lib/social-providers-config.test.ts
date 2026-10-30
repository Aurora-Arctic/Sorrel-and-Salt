import { afterEach, describe, expect, it, vi } from 'vitest';

// Both id and secret, never an empty string, which Better Auth reads as configured. This module is the one place the provider-to-env-var mapping lives, and `.oxlintrc.json` refuses it to any importer but src/lib/auth.ts and a server component;
// this file is the third named exception, as tests/db/test-database-isolation.test.ts is for the db-client boundary (CLAUDE.md rule 2). The pair and the one-provider case are proved through tests/lib/auth.test.ts.
describe('configuredProviders', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('excludes a provider with only an id or only a secret set', async () => {
    vi.stubEnv('GOOGLE_CLIENT_ID', 'test-google-id');
    vi.stubEnv('GOOGLE_CLIENT_SECRET', '');
    vi.stubEnv('DISCORD_CLIENT_ID', '');
    vi.stubEnv('DISCORD_CLIENT_SECRET', 'test-discord-secret');
    vi.stubEnv('FACEBOOK_CLIENT_ID', '');
    vi.stubEnv('FACEBOOK_CLIENT_SECRET', '');
    vi.stubEnv('MICROSOFT_CLIENT_ID', '');
    vi.stubEnv('MICROSOFT_CLIENT_SECRET', '');
    vi.resetModules();

    // oxlint-disable-next-line no-restricted-imports
    const { configuredProviders } = await import('@/lib/social-providers-config');

    expect(configuredProviders()).toEqual([]);
  });

  it('lists every provider set, in roster order', async () => {
    vi.stubEnv('GOOGLE_CLIENT_ID', 'g-id');
    vi.stubEnv('GOOGLE_CLIENT_SECRET', 'g-secret');
    vi.stubEnv('DISCORD_CLIENT_ID', 'd-id');
    vi.stubEnv('DISCORD_CLIENT_SECRET', 'd-secret');
    vi.stubEnv('FACEBOOK_CLIENT_ID', 'f-id');
    vi.stubEnv('FACEBOOK_CLIENT_SECRET', 'f-secret');
    vi.stubEnv('MICROSOFT_CLIENT_ID', 'm-id');
    vi.stubEnv('MICROSOFT_CLIENT_SECRET', 'm-secret');
    vi.resetModules();

    // oxlint-disable-next-line no-restricted-imports
    const { configuredProviders } = await import('@/lib/social-providers-config');

    expect(configuredProviders()).toEqual(['discord', 'google', 'facebook', 'microsoft']);
  });
});
