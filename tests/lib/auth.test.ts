import { describe, expect, it, afterEach, vi } from 'vitest';
import type { BetterAuthOptions } from 'better-auth';
import { getAuthTables } from '@better-auth/core/db';
import { LAST_USED_PROVIDER_COOKIE } from '@/lib/sign-in';

// Better Auth's own production check swallows its rejection and answers 200
// on the default secret, so the repo enforces it synchronously before
// `betterAuth()`: claude-docs/auth/config.md, "Config".
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
// six months (claude-docs/auth/social-providers.md, "Social providers").
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

    expect(Object.keys(auth.options.socialProviders ?? {})).toEqual(['google']);
    expect(auth.options.socialProviders?.google).toMatchObject({
      clientId: 'test-google-id',
      clientSecret: 'test-google-secret',
    });
  });

  // A provider that shares no address would end the callback at
  // `email_not_found`; the placeholder lets the row and session exist so the
  // email page can ask (MB.54). Every provider, since each can withhold one.
  it('maps a profile with no email to the placeholder, and leaves one with an email alone', async () => {
    vi.stubEnv('GOOGLE_CLIENT_ID', 'g-id');
    vi.stubEnv('GOOGLE_CLIENT_SECRET', 'g-secret');
    vi.stubEnv('DISCORD_CLIENT_ID', 'd-id');
    vi.stubEnv('DISCORD_CLIENT_SECRET', 'd-secret');
    vi.stubEnv('FACEBOOK_CLIENT_ID', 'f-id');
    vi.stubEnv('FACEBOOK_CLIENT_SECRET', 'f-secret');
    vi.stubEnv('MICROSOFT_CLIENT_ID', 'm-id');
    vi.stubEnv('MICROSOFT_CLIENT_SECRET', 'm-secret');
    vi.resetModules();

    const { auth } = await import('@/lib/auth');
    const providers = auth.options.socialProviders ?? {};
    // Each provider names its account under its own key; the mapping is typed
    // to the provider's profile, so the probe is cast to reach all four alike.
    const map = (id: keyof typeof providers, profile: Record<string, unknown>) =>
      (providers[id] as { mapProfileToUser: (p: unknown) => unknown }).mapProfileToUser(profile);

    expect(await map('google', { sub: '1', email: 'a@b.test' })).toEqual({});
    expect(await map('google', { sub: '1' })).toEqual({
      email: 'google-1@pending.invalid',
      emailVerified: false,
    });
    expect(await map('discord', { id: '2', email: null })).toEqual({
      email: 'discord-2@pending.invalid',
      emailVerified: false,
    });
    expect(await map('facebook', { id: '3' })).toEqual({
      email: 'facebook-3@pending.invalid',
      emailVerified: false,
    });
    expect(await map('facebook', { sub: '3', email: 'a@b.test' })).toEqual({
      emailVerified: false,
    });
    expect(await map('microsoft', { oid: 'ABC' })).toEqual({
      email: 'microsoft-abc@pending.invalid',
      emailVerified: false,
    });
    expect(await map('microsoft', { oid: 'ABC', email: 'a@b.test' })).toEqual({
      emailVerified: false,
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

// The explicit link from a signed-in session (claude-docs/auth/admin-bootstrap.md, "Linking a
// second provider"). Neither option is read at sign-in.
describe('linking a second provider', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  async function accountLinking() {
    vi.resetModules();
    const { auth } = await import('@/lib/auth');
    return (auth.options as BetterAuthOptions).account?.accountLinking;
  }

  it('lets a linked account carry a different address: the second provider is usually another mailbox', async () => {
    expect((await accountLinking())?.allowDifferentEmails).toBe(true);
  });

  it('keeps allowUnlinkingAll off, so the last provider cannot be removed', async () => {
    expect((await accountLinking())?.allowUnlinkingAll).toBeFalsy();
  });
});

// First-party verification (claude-docs/auth/admin-bootstrap.md, "First-party verification").
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

  it('pins Facebook and Microsoft unverified outside a link flow and leaves Google and Discord their own mapping', async () => {
    const providers = (await configuredAuth()).options.socialProviders ?? {};
    const mapper = (id: keyof typeof providers) =>
      (providers[id] as { mapProfileToUser?: (profile: unknown) => unknown }).mapProfileToUser;
    // With an address: the placeholder mapping (MB.54) has nothing to add.
    const profile = { email: 'someone@auth.test', email_verified: true };

    expect(await mapper('facebook')?.({ id: '1', ...profile })).toEqual({ emailVerified: false });
    expect(await mapper('microsoft')?.({ oid: '1', ...profile })).toEqual({
      emailVerified: false,
    });
    expect(await mapper('google')?.({ sub: '1', ...profile })).toEqual({});
    expect(await mapper('discord')?.({ id: '1', ...profile })).toEqual({});
  });

  it('stamps nothing on a write with no known actor', async () => {
    const before = (await configuredAuth()).options.databaseHooks?.user?.update?.before;
    if (!before) throw new Error('databaseHooks.user.update.before is not configured');

    // Outside any request: no request state, no endpoint context.
    expect(await before({ name: 'Renamed Person' } as never, undefined as never)).toBeUndefined();
  });
});

// Better Auth's limiter (claude-docs/auth/rate-limiting.md, "Rate limiting"). Each value is
// pinned because a dependency bump moving its default would change who is
// limited, or stop limiting anyone, with no diff here to review.
describe('rate limiting', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  async function authAt(nodeEnv: 'production' | 'development') {
    vi.stubEnv('NODE_ENV', nodeEnv);
    vi.stubEnv('BETTER_AUTH_SECRET', 'production-test-secret-at-least-32-characters-long');
    vi.stubEnv('ADMIN_BOOTSTRAP_EMAIL', 'placeholder@admin-bootstrap.invalid');
    vi.resetModules();
    return (await import('@/lib/auth')).auth;
  }

  it('is on at NODE_ENV=production, which every deploy is', async () => {
    expect((await authAt('production')).options.rateLimit?.enabled).toBe(true);
  });

  it('is off outside production, so next dev and the test suites are never throttled', async () => {
    expect((await authAt('development')).options.rateLimit?.enabled).toBe(false);
  });

  it('counts in the database: in memory, each Fluid Compute instance would count alone', async () => {
    expect((await authAt('production')).options.rateLimit?.storage).toBe('database');
  });

  it("keys a visitor on Vercel's own client-address header, which no client can set", async () => {
    const { advanced } = (await authAt('production')).options as BetterAuthOptions;

    expect(advanced?.ipAddress?.ipAddressHeaders).toEqual(['x-vercel-forwarded-for']);
    expect(advanced?.ipAddress?.trustedProxies).toBeUndefined();
    expect(advanced?.ipAddress?.disableIpTracking).toBeFalsy();
  });
});

// Neither is set in src/lib/auth.ts: DESIGN.md names no session lifetime, so
// Better Auth's defaults apply, and these fail if a bump moves one.
describe('session lifetimes', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  async function sessionConfig() {
    vi.resetModules();
    const { auth } = await import('@/lib/auth');
    return (await auth.$context).sessionConfig;
  }

  it('lasts seven days, extended at most once a day, and counts as fresh for a day', async () => {
    const DAY = 24 * 60 * 60;

    expect(await sessionConfig()).toMatchObject({
      expiresIn: 7 * DAY,
      updateAge: DAY,
      freshAge: DAY,
    });
  });
});

describe('stored OAuth tokens', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('are encrypted under BETTER_AUTH_SECRET', async () => {
    vi.resetModules();
    const { auth } = await import('@/lib/auth');

    expect((auth.options as BetterAuthOptions).account?.encryptOAuthTokens).toBe(true);
  });
});

// The browser remembers its own last provider, and nothing about an address
// reaches it: with `storeInDatabase` on, the plugin would add a `users` column
// and write it on every session (claude-docs/auth/plugins.md, "Plugins").
describe('last login method', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  async function lastLoginMethodPlugin() {
    vi.resetModules();
    const { auth } = await import('@/lib/auth');
    const plugin = auth.options.plugins?.find(({ id }) => id === 'last-login-method');
    if (!plugin) throw new Error('lastLoginMethod is not registered');
    return { auth, plugin };
  }

  it('is registered under the shared cookie name, with storeInDatabase unset', async () => {
    const { plugin } = await lastLoginMethodPlugin();

    expect(plugin.options).toEqual({ cookieName: LAST_USED_PROVIDER_COOKIE });
  });

  it('adds no column to the schema Better Auth writes', async () => {
    const { auth, plugin } = await lastLoginMethodPlugin();

    expect(plugin.schema).toBeUndefined();
    expect(Object.keys(getAuthTables(auth.options).user.fields)).not.toContain('lastLoginMethod');
  });
});
