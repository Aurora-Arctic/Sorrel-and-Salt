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
// configured provider.
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

    const { auth } = await import('@/lib/auth');

    expect(auth.options.socialProviders).toEqual({});
  });

  it('registers a provider once both its id and secret are set', async () => {
    vi.stubEnv('GOOGLE_CLIENT_ID', 'test-google-id');
    vi.stubEnv('GOOGLE_CLIENT_SECRET', 'test-google-secret');
    vi.stubEnv('GITHUB_CLIENT_ID', '');
    vi.stubEnv('GITHUB_CLIENT_SECRET', '');
    vi.resetModules();

    const { auth } = await import('@/lib/auth');

    expect(auth.options.socialProviders).toEqual({
      google: { clientId: 'test-google-id', clientSecret: 'test-google-secret' },
    });
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
