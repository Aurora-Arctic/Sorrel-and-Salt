import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import postgres from 'postgres';
import { setupServer } from 'msw/node';
import { BOOTSTRAP_USER_ID } from '@/db/bootstrap';
import {
  promotePrimaryAdmin,
  promotePrimaryAdminAtVerification,
  type SignInProfile,
} from '@/modules/identity';
import { asUser } from '../../../support/as-user';
import {
  expectSignedIn,
  signIn as signInThrough,
  stubProviderCredentials,
} from '../../../support/oauth';
import type { Profile } from '../../../support/types';
import type { ProviderId } from '@/lib/types';

// The primary admin is promoted at a sign-in whose fresh provider profile is
// Google or Discord and verified —
// claude-docs/design-decisions/m2.9-granting-admin.md, "The primary admin".
// The sign-in half drives the real `/api/auth/callback/:id` endpoint with MSW
// standing in for each provider, so what is under test is Better Auth's own
// flow with our hooks attached, not a hand-built context.

const PRIMARY = 'owner@primary-admin.test';

let sql: ReturnType<typeof postgres>;

beforeAll(() => {
  sql = postgres(process.env.DATABASE_URL as string, { onnotice: () => {} });
});

afterAll(async () => {
  await sql.end();
});

// The harness re-clones per file, not per test; every user here is on this domain.
beforeEach(async () => {
  const mine = sql`select id from users where email like '%@primary-admin.test'`;
  await sql`delete from sessions where user_id in (${mine})`;
  await sql`delete from accounts where user_id in (${mine})`;
  await sql`delete from users where email like '%@primary-admin.test'`;
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

async function userRow(email: string) {
  const [row] = await sql`
    select id, role::text as role, email_verified, can_create_workspace, created_by, updated_by
    from users where email = ${email} and deleted_at is null
  `;
  return row as
    | {
        id: string;
        role: string;
        email_verified: boolean;
        can_create_workspace: boolean;
        created_by: string;
        updated_by: string;
      }
    | undefined;
}

// An admin holds the creation flag, which the users CHECK requires (MB.177);
// a user starts without it, so a promotion setting it is what the tests see.
async function insertUser(email: string, role: 'user' | 'admin' = 'user'): Promise<string> {
  const [row] = await sql`
    insert into users (name, email, role, can_create_workspace, created_by, updated_by)
    values ('Fixture Person', ${email}, ${role}, ${role === 'admin'}, ${BOOTSTRAP_USER_ID}, ${BOOTSTRAP_USER_ID})
    returning id
  `;
  return row.id as string;
}

const verifiedGoogle: SignInProfile = { providerId: 'google', email: PRIMARY, emailVerified: true };

describe('promotePrimaryAdmin', () => {
  it('promotes through withAudit, stamped as the signed-in user themselves', async () => {
    const id = await insertUser(PRIMARY);
    expect((await userRow(PRIMARY))?.can_create_workspace).toBe(false);

    const outcome = await promotePrimaryAdmin(asUser({ id, role: 'user' }), {
      accountEmail: PRIMARY,
      profile: verifiedGoogle,
      primaryAdminEmail: PRIMARY,
    });

    expect(outcome).toBe('promoted');
    const row = await userRow(PRIMARY);
    expect(row?.role).toBe('admin');
    // Every admin may create a workspace, and the same write says so (MB.177).
    expect(row?.can_create_workspace).toBe(true);
    // The insert stamped the seed's bootstrap user; the promotion restamps it
    // as the user, which is withAudit taking identity from the session.
    expect(row?.created_by).toBe(BOOTSTRAP_USER_ID);
    expect(row?.updated_by).toBe(id);
  });

  it('matches the variable case-insensitively', async () => {
    const id = await insertUser(PRIMARY);

    const outcome = await promotePrimaryAdmin(asUser({ id, role: 'user' }), {
      accountEmail: PRIMARY,
      profile: verifiedGoogle,
      primaryAdminEmail: 'Owner@Primary-Admin.TEST',
    });

    expect(outcome).toBe('promoted');
  });

  it('accepts a verified Discord profile as well as Google', async () => {
    const id = await insertUser(PRIMARY);

    const outcome = await promotePrimaryAdmin(asUser({ id, role: 'user' }), {
      accountEmail: PRIMARY,
      profile: { providerId: 'discord', email: PRIMARY, emailVerified: true },
      primaryAdminEmail: PRIMARY,
    });

    expect(outcome).toBe('promoted');
  });

  // Each refusal differs from the promoting case above in exactly one field,
  // so what refuses it is that field and not an address that failed to match.
  it.each([
    ['microsoft', { providerId: 'microsoft', email: PRIMARY, emailVerified: true }],
    ['facebook', { providerId: 'facebook', email: PRIMARY, emailVerified: true }],
  ] as const)('refuses a verified %s profile: the provider does not vouch', async (_, profile) => {
    const id = await insertUser(PRIMARY);

    const outcome = await promotePrimaryAdmin(asUser({ id, role: 'user' }), {
      accountEmail: PRIMARY,
      profile,
      primaryAdminEmail: PRIMARY,
    });

    expect(outcome).toBe('provider-does-not-vouch');
    expect((await userRow(PRIMARY))?.role).toBe('user');
  });

  it.each(['google', 'discord'])('refuses an unverified %s profile', async (providerId) => {
    const id = await insertUser(PRIMARY);

    const outcome = await promotePrimaryAdmin(asUser({ id, role: 'user' }), {
      accountEmail: PRIMARY,
      profile: { providerId, email: PRIMARY, emailVerified: false },
      primaryAdminEmail: PRIMARY,
    });

    expect(outcome).toBe('unverified');
    expect((await userRow(PRIMARY))?.role).toBe('user');
  });

  it('refuses when the provider now vouches for a different address than the account holds', async () => {
    const id = await insertUser(PRIMARY);

    const outcome = await promotePrimaryAdmin(asUser({ id, role: 'user' }), {
      accountEmail: PRIMARY,
      profile: { ...verifiedGoogle, email: 'moved.on@primary-admin.test' },
      primaryAdminEmail: PRIMARY,
    });

    expect(outcome).toBe('profile-email-differs');
    expect((await userRow(PRIMARY))?.role).toBe('user');
  });

  it('refuses when no provider profile was captured for this sign-in', async () => {
    const id = await insertUser(PRIMARY);

    const outcome = await promotePrimaryAdmin(asUser({ id, role: 'user' }), {
      accountEmail: PRIMARY,
      profile: undefined,
      primaryAdminEmail: PRIMARY,
    });

    expect(outcome).toBe('no-profile');
    expect((await userRow(PRIMARY))?.role).toBe('user');
  });

  it('never promotes an address the variable does not name', async () => {
    const other = 'someone.else@primary-admin.test';
    const id = await insertUser(other);

    const outcome = await promotePrimaryAdmin(asUser({ id, role: 'user' }), {
      accountEmail: other,
      profile: { ...verifiedGoogle, email: other },
      primaryAdminEmail: PRIMARY,
    });

    expect(outcome).toBe('not-primary');
    expect((await userRow(other))?.role).toBe('user');
  });

  it('promotes nobody when the variable is unset', async () => {
    const id = await insertUser(PRIMARY);

    const outcome = await promotePrimaryAdmin(asUser({ id, role: 'user' }), {
      accountEmail: PRIMARY,
      profile: verifiedGoogle,
      primaryAdminEmail: undefined,
    });

    expect(outcome).toBe('not-primary');
    expect((await userRow(PRIMARY))?.role).toBe('user');
  });

  it('does not rewrite a user who is already admin', async () => {
    const id = await insertUser(PRIMARY, 'admin');

    const outcome = await promotePrimaryAdmin(asUser({ id, role: 'admin' }), {
      accountEmail: PRIMARY,
      profile: verifiedGoogle,
      primaryAdminEmail: PRIMARY,
    });

    expect(outcome).toBe('already-admin');
    // Still stamped by the insert: no write reached the row.
    expect((await userRow(PRIMARY))?.updated_by).toBe(BOOTSTRAP_USER_ID);
  });
});

// ─── Through Better Auth's own callback ─────────────────────────────────────

describe('Promotion at sign-in', () => {
  const server = setupServer();

  beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  let auth: typeof import('@/lib/auth').auth;

  beforeEach(async () => {
    stubProviderCredentials(vi.stubEnv);
    vi.stubEnv('ADMIN_BOOTSTRAP_EMAIL', 'Owner@Primary-Admin.test');
    vi.resetModules();
    ({ auth } = await import('@/lib/auth'));
  });

  const signIn = (provider: ProviderId, profile: Profile) =>
    signInThrough(auth, server, provider, profile);

  it('promotes a new account signing up through verified Google', async () => {
    const response = await signIn('google', { sub: 'g-1', email: PRIMARY, verified: true });

    expectSignedIn(response);
    const row = await userRow(PRIMARY);
    expect(row?.role).toBe('admin');
    expect(row?.can_create_workspace).toBe(true);
    expect(row?.updated_by).toBe(row?.id);
  });

  it('promotes a new account signing up through verified Discord', async () => {
    expectSignedIn(
      await signIn('discord', { sub: '80351110224678912', email: PRIMARY, verified: true }),
    );

    expect((await userRow(PRIMARY))?.role).toBe('admin');
  });

  it('promotes an existing account at its next qualifying sign-in once the variable names it', async () => {
    vi.stubEnv('ADMIN_BOOTSTRAP_EMAIL', 'somebody.else@primary-admin.test');
    expectSignedIn(await signIn('google', { sub: 'g-2', email: PRIMARY, verified: true }));
    expect((await userRow(PRIMARY))?.role).toBe('user');

    vi.stubEnv('ADMIN_BOOTSTRAP_EMAIL', PRIMARY);
    expectSignedIn(await signIn('google', { sub: 'g-2', email: PRIMARY, verified: true }));

    expect((await userRow(PRIMARY))?.role).toBe('admin');
  });

  it.each(['microsoft', 'facebook'] as const)(
    'signs a verified %s profile in as an ordinary user',
    async (provider) => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

      expectSignedIn(
        await signIn(provider, { sub: `${provider}-1`, email: PRIMARY, verified: true }),
      );

      const row = await userRow(PRIMARY);
      expect(row?.role).toBe('user');
      // The reason is logged against the user id, never the address.
      const logged = warn.mock.calls.flat().join(' ');
      expect(logged).toContain(row?.id);
      expect(logged).toContain('provider-does-not-vouch');
      expect(logged.toLowerCase()).not.toContain(PRIMARY);
    },
  );

  it.each(['google', 'discord'] as const)(
    'signs an unverified %s profile in as an ordinary user',
    async (provider) => {
      vi.spyOn(console, 'warn').mockImplementation(() => {});

      expectSignedIn(
        await signIn(provider, { sub: '80351110224678913', email: PRIMARY, verified: false }),
      );

      expect((await userRow(PRIMARY))?.role).toBe('user');
    },
  );

  it('decides on the fresh profile, not the stored emailVerified', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    // Microsoft arrives unverified whatever it claims; the row is then marked
    // verified as our own mail would mark it…
    expectSignedIn(await signIn('microsoft', { sub: 'ms-2', email: PRIMARY, verified: true }));
    expect(await userRow(PRIMARY)).toMatchObject({ email_verified: false, role: 'user' });
    await sql`update users set email_verified = true where email = ${PRIMARY}`;

    // …and a second Microsoft sign-in, over a row that now reads verified, still does not promote.
    expectSignedIn(await signIn('microsoft', { sub: 'ms-2', email: PRIMARY, verified: true }));
    expect((await userRow(PRIMARY))?.role).toBe('user');

    // Google linking to the same verified row is what promotes it.
    expectSignedIn(await signIn('google', { sub: 'g-3', email: PRIMARY, verified: true }));
    expect((await userRow(PRIMARY))?.role).toBe('admin');
  });

  it('does not rewrite an account that is already admin', async () => {
    const id = await insertUser(PRIMARY, 'admin');
    await sql`update users set email_verified = true where id = ${id}`;

    expectSignedIn(await signIn('google', { sub: 'g-4', email: PRIMARY, verified: true }));

    const row = await userRow(PRIMARY);
    expect(row?.role).toBe('admin');
    expect(row?.updated_by).toBe(BOOTSTRAP_USER_ID);
  });

  it('never promotes a verified Google sign-in the variable does not name', async () => {
    const other = 'someone.else@primary-admin.test';

    expectSignedIn(await signIn('google', { sub: 'g-5', email: other, verified: true }));

    expect((await userRow(other))?.role).toBe('user');
  });
});

// ─── At first-party verification ───────────────────────────────────────────

describe('promotePrimaryAdminAtVerification', () => {
  it('promotes through withAudit, stamped as the verifying user themselves', async () => {
    const id = await insertUser(PRIMARY);
    expect((await userRow(PRIMARY))?.can_create_workspace).toBe(false);

    const outcome = await promotePrimaryAdminAtVerification(asUser({ id, role: 'user' }), {
      accountEmail: PRIMARY,
      primaryAdminEmail: 'Owner@Primary-Admin.TEST',
    });

    expect(outcome).toBe('promoted');
    const row = await userRow(PRIMARY);
    expect(row?.role).toBe('admin');
    expect(row?.can_create_workspace).toBe(true);
    expect(row?.created_by).toBe(BOOTSTRAP_USER_ID);
    expect(row?.updated_by).toBe(id);
  });

  it('never promotes an address the variable does not name', async () => {
    const other = 'someone.else@primary-admin.test';
    const id = await insertUser(other);

    const outcome = await promotePrimaryAdminAtVerification(asUser({ id, role: 'user' }), {
      accountEmail: other,
      primaryAdminEmail: PRIMARY,
    });

    expect(outcome).toBe('not-primary');
    expect((await userRow(other))?.role).toBe('user');
  });

  it('promotes nobody when the variable is unset', async () => {
    const id = await insertUser(PRIMARY);

    const outcome = await promotePrimaryAdminAtVerification(asUser({ id, role: 'user' }), {
      accountEmail: PRIMARY,
      primaryAdminEmail: undefined,
    });

    expect(outcome).toBe('not-primary');
    expect((await userRow(PRIMARY))?.role).toBe('user');
  });

  it('does not rewrite a user who is already admin', async () => {
    const id = await insertUser(PRIMARY, 'admin');

    const outcome = await promotePrimaryAdminAtVerification(asUser({ id, role: 'admin' }), {
      accountEmail: PRIMARY,
      primaryAdminEmail: PRIMARY,
    });

    expect(outcome).toBe('already-admin');
    expect((await userRow(PRIMARY))?.updated_by).toBe(BOOTSTRAP_USER_ID);
  });
});
