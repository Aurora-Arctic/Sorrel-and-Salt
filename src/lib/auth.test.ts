import { describe, expect, it, afterEach, vi } from 'vitest';

// Better Auth's own "unset in production" check runs inside an async
// context builder that swallows the rejection rather than surfacing it —
// confirmed by building and serving /api/auth/* with BETTER_AUTH_SECRET
// unset: it logs a BetterAuthError but still answers 200 using the
// well-known default secret. So this repo enforces it itself, synchronously,
// before betterAuth() is ever called (see src/lib/auth.ts).
describe('auth secret', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('throws when unset at NODE_ENV=production', async () => {
    vi.stubEnv('BETTER_AUTH_SECRET', '');
    vi.stubEnv('NODE_ENV', 'production');
    vi.resetModules();

    await expect(import('./auth')).rejects.toThrow('BETTER_AUTH_SECRET is not set');
  });

  it('does not throw when unset outside production', async () => {
    vi.stubEnv('BETTER_AUTH_SECRET', '');
    vi.stubEnv('NODE_ENV', 'development');
    vi.resetModules();

    await expect(import('./auth')).resolves.toBeDefined();
  });
});

// M2.4/M2.5: a provider is registered only when both its client id and
// secret are present — never with an empty string, which Better Auth would
// treat as a configured (but broken) provider rather than an absent one.
describe('social providers', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('registers neither Google nor GitHub when no client credentials are set', async () => {
    vi.stubEnv('GOOGLE_CLIENT_ID', '');
    vi.stubEnv('GOOGLE_CLIENT_SECRET', '');
    vi.stubEnv('GITHUB_CLIENT_ID', '');
    vi.stubEnv('GITHUB_CLIENT_SECRET', '');
    vi.resetModules();

    const { auth } = await import('./auth');

    expect(auth.options.socialProviders).toEqual({});
  });

  it('registers a provider once both its id and secret are set', async () => {
    vi.stubEnv('GOOGLE_CLIENT_ID', 'test-google-id');
    vi.stubEnv('GOOGLE_CLIENT_SECRET', 'test-google-secret');
    vi.stubEnv('GITHUB_CLIENT_ID', '');
    vi.stubEnv('GITHUB_CLIENT_SECRET', '');
    vi.resetModules();

    const { auth } = await import('./auth');

    expect(auth.options.socialProviders).toEqual({
      google: { clientId: 'test-google-id', clientSecret: 'test-google-secret' },
    });
  });
});
