import { afterEach, describe, expect, it, vi } from 'vitest';

// Both id and secret, never an empty string, which Better Auth reads as
// configured. This module is the one place the provider→env-var mapping
// lives (tests/lib/social-providers.test.ts asserts the client-safe roster
// carries none of it), and .oxlintrc.json refuses it to any importer but
// src/lib/auth.ts and a server component — this file is the third named
// exception, the same shape as tests/db/test-database-isolation.test.ts's
// exemption from the db-client boundary (CLAUDE.md rule 2).
describe('clientCredentials', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('returns undefined when only the id is set', async () => {
    vi.stubEnv('GOOGLE_CLIENT_ID', 'test-id');
    vi.stubEnv('GOOGLE_CLIENT_SECRET', '');
    vi.resetModules();
    // oxlint-disable-next-line no-restricted-imports
    const { clientCredentials } = await import('@/lib/social-providers-config');

    expect(clientCredentials('google')).toBeUndefined();
  });

  it('returns undefined when only the secret is set', async () => {
    vi.stubEnv('GOOGLE_CLIENT_ID', '');
    vi.stubEnv('GOOGLE_CLIENT_SECRET', 'test-secret');
    vi.resetModules();
    // oxlint-disable-next-line no-restricted-imports
    const { clientCredentials } = await import('@/lib/social-providers-config');

    expect(clientCredentials('google')).toBeUndefined();
  });

  it('returns the pair once both are set', async () => {
    vi.stubEnv('GOOGLE_CLIENT_ID', 'test-id');
    vi.stubEnv('GOOGLE_CLIENT_SECRET', 'test-secret');
    vi.resetModules();
    // oxlint-disable-next-line no-restricted-imports
    const { clientCredentials } = await import('@/lib/social-providers-config');

    expect(clientCredentials('google')).toEqual({
      clientId: 'test-id',
      clientSecret: 'test-secret',
    });
  });
});

describe('configuredProviders', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('lists a provider only when both its id and secret are set', async () => {
    vi.stubEnv('GOOGLE_CLIENT_ID', 'test-google-id');
    vi.stubEnv('GOOGLE_CLIENT_SECRET', 'test-google-secret');
    vi.stubEnv('DISCORD_CLIENT_ID', '');
    vi.stubEnv('DISCORD_CLIENT_SECRET', '');
    vi.stubEnv('FACEBOOK_CLIENT_ID', '');
    vi.stubEnv('FACEBOOK_CLIENT_SECRET', '');
    vi.stubEnv('MICROSOFT_CLIENT_ID', '');
    vi.stubEnv('MICROSOFT_CLIENT_SECRET', '');
    vi.resetModules();

    // oxlint-disable-next-line no-restricted-imports
    const { configuredProviders } = await import('@/lib/social-providers-config');

    expect(configuredProviders()).toEqual(['google']);
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
