import { describe, expect, it, afterEach, vi } from 'vitest';

// Better Auth's own production check swallows its rejection and answers 200
// on the default secret, so the repo enforces it synchronously before
// `betterAuth()`: claude-docs/auth.md, "Config".
describe('auth secret', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('throws when unset at NODE_ENV=production', async () => {
    vi.stubEnv('BETTER_AUTH_SECRET', '');
    vi.stubEnv('NODE_ENV', 'production');
    vi.resetModules();

    await expect(import('@/lib/auth')).rejects.toThrow('BETTER_AUTH_SECRET is not set');
  });

  it('does not throw when unset outside production', async () => {
    vi.stubEnv('BETTER_AUTH_SECRET', '');
    vi.stubEnv('NODE_ENV', 'development');
    vi.resetModules();

    await expect(import('@/lib/auth')).resolves.toBeDefined();
  });
});

// Both id and secret, never an empty string, which Better Auth reads as a
// configured provider. The roster is Google, Discord, Facebook and Microsoft
// (M2.6) — GitHub (M2.5) was removed when the roster was re-scoped, and
// Apple was considered and dropped for a client secret that expires every
// six months (claude-docs/auth.md, "Social providers").
describe('social providers', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('registers none of the four when no client credentials are set', async () => {
    vi.stubEnv('GOOGLE_CLIENT_ID', '');
    vi.stubEnv('GOOGLE_CLIENT_SECRET', '');
    vi.stubEnv('DISCORD_CLIENT_ID', '');
    vi.stubEnv('DISCORD_CLIENT_SECRET', '');
    vi.stubEnv('FACEBOOK_CLIENT_ID', '');
    vi.stubEnv('FACEBOOK_CLIENT_SECRET', '');
    vi.stubEnv('MICROSOFT_CLIENT_ID', '');
    vi.stubEnv('MICROSOFT_CLIENT_SECRET', '');
    vi.resetModules();

    const { auth } = await import('@/lib/auth');

    expect(auth.options.socialProviders).toEqual({});
  });

  it('registers a provider once both its id and secret are set', async () => {
    vi.stubEnv('GOOGLE_CLIENT_ID', 'test-google-id');
    vi.stubEnv('GOOGLE_CLIENT_SECRET', 'test-google-secret');
    vi.stubEnv('DISCORD_CLIENT_ID', '');
    vi.stubEnv('DISCORD_CLIENT_SECRET', '');
    vi.stubEnv('FACEBOOK_CLIENT_ID', '');
    vi.stubEnv('FACEBOOK_CLIENT_SECRET', '');
    vi.stubEnv('MICROSOFT_CLIENT_ID', '');
    vi.stubEnv('MICROSOFT_CLIENT_SECRET', '');
    vi.resetModules();

    const { auth } = await import('@/lib/auth');

    expect(auth.options.socialProviders).toEqual({
      google: { clientId: 'test-google-id', clientSecret: 'test-google-secret' },
    });
  });

  it('registers Microsoft with tenantId "common" so personal accounts can sign in', async () => {
    vi.stubEnv('GOOGLE_CLIENT_ID', '');
    vi.stubEnv('GOOGLE_CLIENT_SECRET', '');
    vi.stubEnv('DISCORD_CLIENT_ID', '');
    vi.stubEnv('DISCORD_CLIENT_SECRET', '');
    vi.stubEnv('FACEBOOK_CLIENT_ID', '');
    vi.stubEnv('FACEBOOK_CLIENT_SECRET', '');
    vi.stubEnv('MICROSOFT_CLIENT_ID', 'test-microsoft-id');
    vi.stubEnv('MICROSOFT_CLIENT_SECRET', 'test-microsoft-secret');
    vi.resetModules();

    const { auth } = await import('@/lib/auth');

    expect(auth.options.socialProviders?.microsoft).toMatchObject({ tenantId: 'common' });
  });

  it('lets MICROSOFT_TENANT_ID override the "common" default', async () => {
    vi.stubEnv('GOOGLE_CLIENT_ID', '');
    vi.stubEnv('GOOGLE_CLIENT_SECRET', '');
    vi.stubEnv('DISCORD_CLIENT_ID', '');
    vi.stubEnv('DISCORD_CLIENT_SECRET', '');
    vi.stubEnv('FACEBOOK_CLIENT_ID', '');
    vi.stubEnv('FACEBOOK_CLIENT_SECRET', '');
    vi.stubEnv('MICROSOFT_CLIENT_ID', 'test-microsoft-id');
    vi.stubEnv('MICROSOFT_CLIENT_SECRET', 'test-microsoft-secret');
    vi.stubEnv('MICROSOFT_TENANT_ID', 'a-specific-tenant');
    vi.resetModules();

    const { auth } = await import('@/lib/auth');

    expect(auth.options.socialProviders?.microsoft).toMatchObject({
      tenantId: 'a-specific-tenant',
    });
  });

  it('registers every configured provider consistently with configuredProviders()', async () => {
    vi.stubEnv('GOOGLE_CLIENT_ID', 'g-id');
    vi.stubEnv('GOOGLE_CLIENT_SECRET', 'g-secret');
    vi.stubEnv('DISCORD_CLIENT_ID', 'd-id');
    vi.stubEnv('DISCORD_CLIENT_SECRET', 'd-secret');
    vi.stubEnv('FACEBOOK_CLIENT_ID', '');
    vi.stubEnv('FACEBOOK_CLIENT_SECRET', '');
    vi.stubEnv('MICROSOFT_CLIENT_ID', '');
    vi.stubEnv('MICROSOFT_CLIENT_SECRET', '');
    vi.resetModules();

    const { auth } = await import('@/lib/auth');
    // A test is a legitimate exception to the client-boundary rule below —
    // it needs to assert the server-only mapping directly, the same as
    // tests/db/test-database-isolation.test.ts is exempt from the db-client
    // boundary (CLAUDE.md rule 2).
    // oxlint-disable-next-line no-restricted-imports
    const { configuredProviders } = await import('@/lib/social-providers-config');

    expect(Object.keys(auth.options.socialProviders ?? {}).sort()).toEqual(
      configuredProviders().sort(),
    );
  });
});

// One BETTER_AUTH_URL cannot cover three production origins; an untrusted Host
// falls back rather than being reflected into an OAuth redirect_uri.
describe('baseURL', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('is a fixed http://localhost:8000 outside production', async () => {
    // `next dev --hostname 0.0.0.0` computes the origin from its bind address,
    // not the Host header, so the default would send every local redirect_uri
    // to 0.0.0.0:8000.
    vi.stubEnv('NODE_ENV', 'development');
    vi.resetModules();

    const { auth } = await import('@/lib/auth');

    expect(auth.options.baseURL).toBe('http://localhost:8000');
  });

  it('allows sorrelandsalt.com, the staging alias, and any hotfix-* preview at production', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('BETTER_AUTH_SECRET', 'production-test-secret-at-least-32-characters-long');
    vi.resetModules();

    const { auth } = await import('@/lib/auth');

    expect(auth.options.baseURL).toEqual({
      allowedHosts: [
        'sorrelandsalt.com',
        'staging.sorrelandsalt.com',
        'hotfix-*.sorrelandsalt.com',
      ],
      fallback: 'https://sorrelandsalt.com',
      protocol: 'https',
    });
  });
});

// `role`/`canCreateWorkspace` are registered with `input: false`, so no client
// request sets them; `name`/`image` keep Better Auth's own names.
describe('user field mapping', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('registers role and canCreateWorkspace as not settable from client input', async () => {
    vi.resetModules();
    const { auth } = await import('@/lib/auth');

    expect(auth.options.user?.additionalFields?.role).toMatchObject({ input: false });
    expect(auth.options.user?.additionalFields?.canCreateWorkspace).toMatchObject({ input: false });
  });
});

// The one write to `users` outside withAudit: there is no session yet, so the
// new user is its own creator (`createdBy` is NOT NULL with no default).
describe('admin bootstrap', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  async function beforeCreateHook() {
    vi.resetModules();
    const { auth } = await import('@/lib/auth');
    const hook = auth.options.databaseHooks?.user?.create?.before;
    if (!hook) throw new Error('databaseHooks.user.create.before is not configured');
    return hook;
  }

  it('stamps a new user as its own creator and updater', async () => {
    vi.stubEnv('ADMIN_BOOTSTRAP_EMAIL', '');
    const before = await beforeCreateHook();

    const result = await before({ email: 'new.member@example.com', name: 'New Member' } as never);

    expect(result).toBeTruthy();
    const data = (result as { data: Record<string, unknown> }).data;
    expect(data.id).toEqual(expect.any(String));
    expect(data.createdBy).toBe(data.id);
    expect(data.updatedBy).toBe(data.id);
    expect(data.role).toBeUndefined();
  });

  it('promotes the user matching ADMIN_BOOTSTRAP_EMAIL to admin', async () => {
    vi.stubEnv('ADMIN_BOOTSTRAP_EMAIL', 'owner@sorrelandsalt.com');
    const before = await beforeCreateHook();

    const result = await before({ email: 'owner@sorrelandsalt.com', name: 'Site Owner' } as never);

    const data = (result as { data: Record<string, unknown> }).data;
    expect(data.role).toBe('admin');
  });

  it('matches the bootstrap email case-insensitively', async () => {
    vi.stubEnv('ADMIN_BOOTSTRAP_EMAIL', 'Owner@SorrelAndSalt.com');
    const before = await beforeCreateHook();

    const result = await before({ email: 'owner@sorrelandsalt.com', name: 'Site Owner' } as never);

    const data = (result as { data: Record<string, unknown> }).data;
    expect(data.role).toBe('admin');
  });

  it('leaves every other user at the column default (no role set) when unset', async () => {
    vi.stubEnv('ADMIN_BOOTSTRAP_EMAIL', '');
    const before = await beforeCreateHook();

    const result = await before({
      email: 'someone.else@example.com',
      name: 'Someone Else',
    } as never);

    const data = (result as { data: Record<string, unknown> }).data;
    expect(data.role).toBeUndefined();
  });
});
