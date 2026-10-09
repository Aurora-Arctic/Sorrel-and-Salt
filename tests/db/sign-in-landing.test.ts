import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import postgres from 'postgres';
import { setupServer } from 'msw/node';
import { BOOTSTRAP_USER_ID } from '@/db/bootstrap';
import {
  cookieHeader,
  landingOf,
  signIn as signInThrough,
  PROVIDER_CREDENTIALS,
} from '../support/oauth';
import type { Message, ProviderId } from '@/lib/types';
import { importAuth } from '../support/auth-module';
import type { AuthInstance, Profile } from '../support/types';

// Where the callback lands a sign-in (MB.113): a return path wins, `/coven`
// included; with none, an admin — by the role held once any promotion at this
// sign-in has run — lands on /admin, and everyone else on /coven. An
// unverified account lands on the email page first, whatever its role. Driven
// through Better Auth's real endpoints, as SignInPanel starts them
// (claude-docs/auth/route-protection.md, "Route protection").

const send = vi.hoisted(() => vi.fn<(message: Message) => Promise<void>>());
vi.mock('@/lib/mail', () => ({ send }));

const DOMAIN = '@sign-in-landing.test';
const PRIMARY = `primary${DOMAIN}`;
const ADMIN = `admin${DOMAIN}`;
const MEMBER = `member${DOMAIN}`;

let sql: ReturnType<typeof postgres>;

beforeAll(() => {
  sql = postgres(process.env.DATABASE_URL as string, { onnotice: () => {} });
});

afterAll(async () => {
  await sql.end();
});

const server = setupServer();
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

let auth: AuthInstance;

// Provider credentials at import; the primary admin's address is read per
// request, so it is stubbed beside them for the whole file.
beforeAll(async () => {
  auth = await importAuth(PROVIDER_CREDENTIALS);
  vi.stubEnv('ADMIN_BOOTSTRAP_EMAIL', PRIMARY);
});

afterAll(() => {
  vi.unstubAllEnvs();
});

// The harness re-clones per file, not per test; every user here is on this domain.
beforeEach(async () => {
  const mine = sql`select id from users where email like ${`%${DOMAIN}`}`;
  await sql`delete from sessions where user_id in (${mine})`;
  await sql`delete from accounts where user_id in (${mine})`;
  await sql`delete from users where email like ${`%${DOMAIN}`}`;

  send.mockReset();
  // Microsoft never vouches, so the primary admin's sign-in through it logs a refusal.
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

const signIn = (provider: ProviderId, profile: Profile, next?: string) =>
  signInThrough(auth, server, provider, profile, next);

async function roleOf(email: string): Promise<string | undefined> {
  const [row] = await sql`
    select role::text as role from users where email = ${email} and deleted_at is null
  `;
  return row?.role as string | undefined;
}

/** A verified row with no provider account yet: a verified Google sign-in links to it. */
async function insertVerified(email: string, role: 'user' | 'admin'): Promise<void> {
  await sql`
    insert into users (name, email, role, can_create_workspace, email_verified, created_by, updated_by)
    values ('Fixture Person', ${email}, ${role}, ${role === 'admin'}, true,
            ${BOOTSTRAP_USER_ID}, ${BOOTSTRAP_USER_ID})
  `;
}

/** The link in the one verification mail sent so far. */
function mailedLink(): string {
  expect(send).toHaveBeenCalledTimes(1);
  const link = send.mock.calls[0][0].text.match(/https?:\/\/\S+\/verify-email\?[^\s\]]+/)?.[0];
  if (!link) throw new Error('no verification link in the mail');
  return link;
}

const callbackOf = (link: string) => new URL(link).searchParams.get('callbackURL');

describe('a sign-in with no return path', () => {
  it('lands a verified admin on the admin area', async () => {
    await insertVerified(ADMIN, 'admin');

    const response = await signIn('google', { sub: 'g-admin', email: ADMIN, verified: true });

    expect(response.status).toBe(302);
    expect(landingOf(response)).toBe('/admin');
    expect(cookieHeader(response)).toMatch(/session_token=/);
  });

  // Why the admin's could have been /coven: the same sign-in, differing only
  // in the row's role, lands there.
  it('lands anyone else on /coven, as it always has', async () => {
    await insertVerified(MEMBER, 'user');

    const response = await signIn('google', { sub: 'g-member', email: MEMBER, verified: true });

    expect(landingOf(response)).toBe('/coven');
    expect(await roleOf(MEMBER)).toBe('user');
  });

  it('sends an unverified admin to the bare email page first, and the mailed link lands there bare too', async () => {
    const first = await signIn('microsoft', { sub: 'ms-admin', email: ADMIN, verified: true });
    expect(landingOf(first)).toBe('/account/email');
    // An admin holds the creation flag, which the users CHECK requires (MB.177).
    await sql`update users set role = 'admin', can_create_workspace = true where email = ${ADMIN}`;
    // The preconditions: an admin, and still unverified — Microsoft never vouches.
    const [row] =
      await sql`select role::text as role, email_verified from users where email = ${ADMIN}`;
    expect(row).toEqual({ role: 'admin', email_verified: false });

    const again = await signIn('microsoft', { sub: 'ms-admin', email: ADMIN, verified: true });

    // Not /admin, and no `next` for Continue to take there: with none, the
    // email page's Continue lands the account by its role
    // (tests/app/account/email/page.test.tsx).
    expect(landingOf(again)).toBe('/account/email');
    expect(callbackOf(mailedLink())).toBe('/account/email?verified');
  });
});

describe('a sign-in with a return path', () => {
  it('lands an admin on it, /coven included', async () => {
    await insertVerified(ADMIN, 'admin');
    const admin = { sub: 'g-admin', email: ADMIN, verified: true };

    expect(landingOf(await signIn('google', admin, '/coven'))).toBe('/coven');
    expect(landingOf(await signIn('google', admin, '/compendium?q=rue'))).toBe('/compendium?q=rue');
    // The same admin with no return path, so the two above were the return path's doing.
    expect(landingOf(await signIn('google', admin))).toBe('/admin');
  });

  it('carries an explicit /coven through the email page and its mailed link', async () => {
    const response = await signIn(
      'microsoft',
      { sub: 'ms-member', email: MEMBER, verified: true },
      '/coven',
    );

    expect(landingOf(response)).toBe('/account/email?next=%2Fcoven');
    expect(callbackOf(mailedLink())).toBe('/account/email?verified&next=%2Fcoven');
  });
});
