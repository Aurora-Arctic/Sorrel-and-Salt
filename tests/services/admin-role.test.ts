import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import postgres from 'postgres';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { BOOTSTRAP_USER_ID } from '@/db/bootstrap';
import { promotePrimaryAdmin, type SignInProfile } from '@/services/admin-role';
import { asUser } from '../support/as-user';

// The primary admin is promoted at a sign-in whose fresh provider profile is
// Google or Discord and verified —
// claude-docs/design-decisions/m2.9-granting-admin.md, "The primary admin".
// The sign-in half drives the real `/api/auth/callback/:id` endpoint with MSW
// standing in for each provider, so what is under test is Better Auth's own
// flow with our hooks attached, not a hand-built context.

const PRIMARY = 'owner@primary-admin.test';
const ORIGIN = 'http://localhost:8000';

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
    select id, role::text as role, email_verified, created_by, updated_by
    from users where email = ${email} and deleted_at is null
  `;
  return row as
    | {
        id: string;
        role: string;
        email_verified: boolean;
        created_by: string;
        updated_by: string;
      }
    | undefined;
}

async function insertUser(email: string, role: 'user' | 'admin' = 'user'): Promise<string> {
  const [row] = await sql`
    insert into users (name, email, role, created_by, updated_by)
    values ('Fixture Person', ${email}, ${role}, ${BOOTSTRAP_USER_ID}, ${BOOTSTRAP_USER_ID})
    returning id
  `;
  return row.id as string;
}

const verifiedGoogle: SignInProfile = { providerId: 'google', email: PRIMARY, emailVerified: true };

describe('promotePrimaryAdmin', () => {
  it('promotes through withAudit, stamped as the signed-in user themselves', async () => {
    const id = await insertUser(PRIMARY);

    const outcome = await promotePrimaryAdmin(asUser({ id, role: 'user' }), {
      accountEmail: PRIMARY,
      profile: verifiedGoogle,
      primaryAdminEmail: PRIMARY,
    });

    expect(outcome).toBe('promoted');
    const row = await userRow(PRIMARY);
    expect(row?.role).toBe('admin');
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

type ProviderId = 'google' | 'discord' | 'facebook' | 'microsoft';

interface Profile {
  /** The provider's own stable account id. */
  sub: string;
  email: string;
  verified: boolean;
}

// An unsigned JWT: Google and Microsoft decode the id token they received from
// their own token endpoint without re-verifying it, which is what makes the
// code exchange, not the token's signature, the trust boundary here.
function idToken(claims: Record<string, unknown>): string {
  const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  return `${encode({ alg: 'none', typ: 'JWT' })}.${encode({ iat: now, exp: now + 3600, ...claims })}.`;
}

const TENANT = '9188040d-6c67-4c5b-b112-36a304b66dad';

function providerHandlers(provider: ProviderId, profile: Profile) {
  const token = { access_token: 'test-access-token', token_type: 'Bearer', expires_in: 3600 };
  switch (provider) {
    case 'google':
      return [
        http.post('https://oauth2.googleapis.com/token', () =>
          HttpResponse.json({
            ...token,
            id_token: idToken({
              iss: 'https://accounts.google.com',
              aud: 'test-google-id',
              sub: profile.sub,
              email: profile.email,
              email_verified: profile.verified,
              name: 'Fixture Person',
            }),
          }),
        ),
      ];
    case 'discord':
      return [
        http.post('https://discord.com/api/oauth2/token', () => HttpResponse.json(token)),
        // Better Auth percent-encodes the `@`, which MSW's path matcher does not decode.
        http.get('https://discord.com/api/users/%40me', () =>
          HttpResponse.json({
            id: profile.sub,
            username: 'fixtureperson',
            global_name: 'Fixture Person',
            discriminator: '0',
            avatar: null,
            email: profile.email,
            verified: profile.verified,
          }),
        ),
      ];
    case 'facebook':
      return [
        http.get('https://graph.facebook.com/v24.0/oauth/access_token', () =>
          HttpResponse.json(token),
        ),
        http.post('https://graph.facebook.com/v24.0/oauth/access_token', () =>
          HttpResponse.json(token),
        ),
        http.get('https://graph.facebook.com/debug_token', () =>
          HttpResponse.json({
            data: { is_valid: true, app_id: 'test-facebook-id', user_id: profile.sub },
          }),
        ),
        http.get('https://graph.facebook.com/me', () =>
          HttpResponse.json({
            id: profile.sub,
            name: 'Fixture Person',
            email: profile.email,
            // Facebook's graph never sends this; were it honoured, this
            // profile would qualify on every field but the provider.
            email_verified: profile.verified,
            picture: { data: { url: 'https://example.test/p.png' } },
          }),
        ),
      ];
    case 'microsoft':
      return [
        http.post(`https://login.microsoftonline.com/common/oauth2/v2.0/token`, () =>
          HttpResponse.json({
            ...token,
            id_token: idToken({
              iss: `https://login.microsoftonline.com/${TENANT}/v2.0`,
              aud: 'test-microsoft-id',
              tid: TENANT,
              oid: profile.sub,
              sub: profile.sub,
              email: profile.email,
              email_verified: profile.verified,
              name: 'Fixture Person',
            }),
          }),
        ),
        http.get(
          'https://graph.microsoft.com/v1.0/me/photos/*',
          () => new HttpResponse(null, { status: 404 }),
        ),
      ];
  }
}

describe('Promotion at sign-in', () => {
  const server = setupServer();

  beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  let auth: typeof import('@/lib/auth').auth;

  beforeEach(async () => {
    for (const provider of ['GOOGLE', 'DISCORD', 'FACEBOOK', 'MICROSOFT']) {
      vi.stubEnv(`${provider}_CLIENT_ID`, `test-${provider.toLowerCase()}-id`);
      vi.stubEnv(`${provider}_CLIENT_SECRET`, `test-${provider.toLowerCase()}-secret`);
    }
    vi.stubEnv('MICROSOFT_TENANT_ID', '');
    vi.stubEnv('ADMIN_BOOTSTRAP_EMAIL', 'Owner@Primary-Admin.test');
    vi.resetModules();
    ({ auth } = await import('@/lib/auth'));
  });

  /** One full round trip: start the sign-in, then land on the callback. Returns the redirect. */
  async function signIn(provider: ProviderId, profile: Profile): Promise<Response> {
    server.use(...providerHandlers(provider, profile));

    const start = await auth.handler(
      new Request(`${ORIGIN}/api/auth/sign-in/social`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', origin: ORIGIN },
        body: JSON.stringify({ provider, callbackURL: '/coven' }),
      }),
    );
    expect(start.status, await start.clone().text()).toBe(200);
    const { url } = (await start.json()) as { url: string };
    const state = new URL(url).searchParams.get('state');
    const cookie = start.headers
      .getSetCookie()
      .map((header) => header.split(';')[0])
      .join('; ');

    return auth.handler(
      new Request(`${ORIGIN}/api/auth/callback/${provider}?code=test-code&state=${state}`, {
        headers: { cookie },
      }),
    );
  }

  /** The callback redirected to where the sign-in asked to go, not to an error page. */
  function expectSignedIn(response: Response) {
    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toMatch(/\/coven$/);
  }

  it('promotes a new account signing up through verified Google', async () => {
    const response = await signIn('google', { sub: 'g-1', email: PRIMARY, verified: true });

    expectSignedIn(response);
    const row = await userRow(PRIMARY);
    expect(row?.role).toBe('admin');
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

    // Microsoft marks the stored row verified on the way in…
    expectSignedIn(await signIn('microsoft', { sub: 'ms-2', email: PRIMARY, verified: true }));
    expect(await userRow(PRIMARY)).toMatchObject({ email_verified: true, role: 'user' });

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
