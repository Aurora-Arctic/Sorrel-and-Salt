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

// A single BETTER_AUTH_URL env var can't cover production — it spans three
// real origins (sorrelandsalt.com, the staging alias, one hotfix-<slug>
// domain per open PR) that Vercel's Preview scope can't tell apart. This
// asserts the allowedHosts config resolves each correctly, and that an
// untrusted Host falls back to the production URL rather than being
// reflected into an OAuth redirect_uri.
describe('baseURL', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('is a fixed http://localhost:8000 outside production', async () => {
    // Not left to Better Auth's own per-request default: `next dev
    // --hostname 0.0.0.0` computes the request origin from its bind
    // address, not the client's Host header, which would otherwise send
    // every local OAuth redirect_uri to 0.0.0.0:8000 instead of the
    // localhost:8000 registered with Google/GitHub — confirmed by curling
    // a running dev server with a spoofed Host and seeing no change.
    vi.stubEnv('NODE_ENV', 'development');
    vi.resetModules();

    const { auth } = await import('./auth');

    expect(auth.options.baseURL).toBe('http://localhost:8000');
  });

  it('allows sorrelandsalt.com, the staging alias, and any hotfix-* preview at production', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('BETTER_AUTH_SECRET', 'production-test-secret-at-least-32-characters-long');
    vi.resetModules();

    const { auth } = await import('./auth');

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

// M2.3: role/canCreateWorkspace don't exist on Better Auth's own core User
// shape — `user.additionalFields` registers them with `input: false` so no
// client request can ever set them (CLAUDE.md's "No API or UI path grants
// admin"). `name`/`image` stay Better Auth's own names (no `user.fields`
// mapping) — DESIGN.md §5 was corrected to match rather than renaming them.
describe('user field mapping', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('registers role and canCreateWorkspace as not settable from client input', async () => {
    vi.resetModules();
    const { auth } = await import('./auth');

    expect(auth.options.user?.additionalFields?.role).toMatchObject({ input: false });
    expect(auth.options.user?.additionalFields?.canCreateWorkspace).toMatchObject({ input: false });
  });
});

// M2.3: `createdBy`/`updatedBy` are NOT NULL with no database default
// (src/db/audit.ts), and a brand-new OAuth user has no pre-existing
// creator — so the new user is its own, same self-satisfying pattern
// MB.5 documents for the seed bootstrap row. This is the one write to
// `users` that doesn't go through withAudit(session, fn) (CLAUDE.md rule
// 3): there is no session yet, because this *is* how one comes to exist.
describe('admin bootstrap', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  async function beforeCreateHook() {
    vi.resetModules();
    const { auth } = await import('./auth');
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
