import { describe, expect, it, afterEach, vi } from 'vitest';
import type { BetterAuthOptions } from 'better-auth';

// Better Auth's own production check swallows its rejection and answers 200
// on the default secret, so the repo enforces it synchronously before
// `betterAuth()`: claude-docs/auth.md, "Config".
describe('auth secret', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('throws when unset at NODE_ENV=production', async () => {
    vi.stubEnv('BETTER_AUTH_SECRET', '');
    vi.stubEnv('ADMIN_BOOTSTRAP_EMAIL', 'placeholder@admin-bootstrap.invalid');
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
    vi.stubEnv('ADMIN_BOOTSTRAP_EMAIL', 'placeholder@admin-bootstrap.invalid');
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
// new user is its own creator (`createdBy` is NOT NULL with no default). It
// never sets `role`: the primary admin is promoted at sign-in, through
// withAudit (tests/modules/identity/services/admin-role.test.ts).
describe('sign-up hook', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('stamps a new user as its own creator and updater, and never promotes', async () => {
    vi.stubEnv('ADMIN_BOOTSTRAP_EMAIL', 'owner@example.com');
    vi.resetModules();
    const { auth } = await import('@/lib/auth');
    const before = auth.options.databaseHooks?.user?.create?.before;
    if (!before) throw new Error('databaseHooks.user.create.before is not configured');

    const result = await before({ email: 'owner@example.com', name: 'Site Owner' } as never);

    const data = (result as { data: Record<string, unknown> }).data;
    expect(data.id).toEqual(expect.any(String));
    expect(data.createdBy).toBe(data.id);
    expect(data.updatedBy).toBe(data.id);
    // The address matches the variable, so only the hook's own rule keeps this unset.
    expect(data.role).toBeUndefined();
  });
});

// Everything the primary admin's protection rests on holds only while the
// variable is set, so a deployed build refuses to start without it; the check
// keys on NODE_ENV=production, as BETTER_AUTH_SECRET's does.
describe('ADMIN_BOOTSTRAP_EMAIL', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('throws when unset at NODE_ENV=production', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('BETTER_AUTH_SECRET', 'production-test-secret-at-least-32-characters-long');
    vi.stubEnv('ADMIN_BOOTSTRAP_EMAIL', '');
    vi.resetModules();

    await expect(import('@/lib/auth')).rejects.toThrow('ADMIN_BOOTSTRAP_EMAIL is not set');
  });

  it('starts at NODE_ENV=production once it is set', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('BETTER_AUTH_SECRET', 'production-test-secret-at-least-32-characters-long');
    vi.stubEnv('ADMIN_BOOTSTRAP_EMAIL', 'placeholder@admin-bootstrap.invalid');
    vi.resetModules();

    await expect(import('@/lib/auth')).resolves.toBeDefined();
  });

  it('does not throw when unset outside production', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('ADMIN_BOOTSTRAP_EMAIL', '');
    vi.resetModules();

    await expect(import('@/lib/auth')).resolves.toBeDefined();
  });
});

// Each of these, turned on, would let the address on an account change under
// the primary admin and move the protection to whoever now holds it.
describe('options that would move the primary admin', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  async function configuredAuth() {
    for (const provider of ['GOOGLE', 'DISCORD', 'FACEBOOK', 'MICROSOFT']) {
      vi.stubEnv(`${provider}_CLIENT_ID`, `test-${provider.toLowerCase()}-id`);
      vi.stubEnv(`${provider}_CLIENT_SECRET`, `test-${provider.toLowerCase()}-secret`);
    }
    vi.resetModules();
    return (await import('@/lib/auth')).auth;
  }

  it('keeps user.changeEmail off: a user could retarget the address themselves', async () => {
    const auth = await configuredAuth();

    expect(auth.options.user?.changeEmail?.enabled).toBe(false);
  });

  it('keeps overrideUserInfoOnSignIn off on every provider: a sign-in would rewrite the stored email', async () => {
    const auth = await configuredAuth();
    const providers = Object.entries(auth.options.socialProviders ?? {});

    // All four registered, so an empty list cannot pass this vacuously.
    expect(providers.map(([id]) => id).sort()).toEqual([
      'discord',
      'facebook',
      'google',
      'microsoft',
    ]);
    for (const [id, config] of providers) {
      expect(
        (config as { overrideUserInfoOnSignIn?: boolean }).overrideUserInfoOnSignIn,
        id,
      ).toBeFalsy();
    }
  });

  it('trusts no provider for linking: a trusted one skips the verified-email check', async () => {
    const auth = await configuredAuth();

    const { account } = auth.options as BetterAuthOptions;

    expect(account?.accountLinking?.trustedProviders ?? []).toEqual([]);
  });
});

// First-party verification (claude-docs/auth.md, "First-party verification").
// Each value is pinned because each one, changed, changes who can verify what.
describe('email verification', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  async function configuredAuth() {
    for (const provider of ['GOOGLE', 'DISCORD', 'FACEBOOK', 'MICROSOFT']) {
      vi.stubEnv(`${provider}_CLIENT_ID`, `test-${provider.toLowerCase()}-id`);
      vi.stubEnv(`${provider}_CLIENT_SECRET`, `test-${provider.toLowerCase()}-secret`);
    }
    vi.resetModules();
    return (await import('@/lib/auth')).auth;
  }

  it('mails a one-hour link at sign-up and never signs anyone in from it', async () => {
    const { emailVerification } = (await configuredAuth()).options as BetterAuthOptions;

    expect(emailVerification?.sendVerificationEmail).toEqual(expect.any(Function));
    expect(emailVerification?.beforeEmailVerification).toEqual(expect.any(Function));
    expect(emailVerification?.expiresIn).toBe(3600);
    expect(emailVerification?.sendOnSignUp).toBe(true);
    expect(emailVerification?.autoSignInAfterVerification).toBe(false);
  });

  it('leaves requireLocalEmailVerified at its default, so an unverified row refuses a link', async () => {
    const { account } = (await configuredAuth()).options as BetterAuthOptions;

    expect(account?.accountLinking?.requireLocalEmailVerified).toBeUndefined();
  });

  it('withholds a session from no provider: verification is offered, not required', async () => {
    const providers = Object.entries((await configuredAuth()).options.socialProviders ?? {});

    expect(providers).toHaveLength(4);
    for (const [id, config] of providers) {
      expect(
        (config as { requireEmailVerification?: boolean }).requireEmailVerification,
        id,
      ).toBeFalsy();
    }
  });

  it('pins Facebook and Microsoft unverified and leaves Google and Discord their own mapping', async () => {
    const providers = (await configuredAuth()).options.socialProviders ?? {};
    const mapper = (id: keyof typeof providers) =>
      (providers[id] as { mapProfileToUser?: (profile: unknown) => unknown }).mapProfileToUser;

    expect(await mapper('facebook')?.({ email_verified: true })).toEqual({ emailVerified: false });
    expect(await mapper('microsoft')?.({ email_verified: true })).toEqual({
      emailVerified: false,
    });
    expect(mapper('google')).toBeUndefined();
    expect(mapper('discord')).toBeUndefined();
  });

  it('stamps nothing on a write with no known actor', async () => {
    const before = (await configuredAuth()).options.databaseHooks?.user?.update?.before;
    if (!before) throw new Error('databaseHooks.user.update.before is not configured');

    // Outside any request: no request state, no endpoint context.
    expect(await before({ name: 'Renamed Person' } as never, undefined as never)).toBeUndefined();
  });
});
