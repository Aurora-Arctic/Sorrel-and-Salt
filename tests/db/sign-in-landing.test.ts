import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import postgres from 'postgres';
import { setupServer } from 'msw/node';
import { BOOTSTRAP_USER_ID } from '@/db/bootstrap';
import {
  cookieHeader,
  landingOf,
  signIn as signInThrough,
  stubProviderCredentials,
} from '../support/oauth';
import type { Message, ProviderId } from '@/lib/types';
import type { Profile } from '../support/types';

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

let auth: typeof import('@/lib/auth').auth;

// The harness re-clones per file, not per test; every user here is on this domain.
beforeEach(async () => {
  const mine = sql`select id from users where email like ${`%${DOMAIN}`}`;
  await sql`delete from sessions where user_id in (${mine})`;
  await sql`delete from accounts where user_id in (${mine})`;
  await sql`delete from users where email like ${`%${DOMAIN}`}`;

  send.mockReset();
  stubProviderCredentials(vi.stubEnv);
  vi.stubEnv('ADMIN_BOOTSTRAP_EMAIL', PRIMARY);
  vi.resetModules();
  ({ auth } = await import('@/lib/auth'));
  // Microsoft never vouches, so the primary admin's sign-in through it logs a refusal.
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
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
    insert into users (name, email, role, email_verified, created_by, updated_by)
    values ('Fixture Person', ${email}, ${role}, true, ${BOOTSTRAP_USER_ID}, ${BOOTSTRAP_USER_ID})
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

  it('lands the primary admin promoted at this very sign-in on the admin area', async () => {
    // Why it could have landed on /coven: the row did not exist, so it was
    // created a user, and only the promotion made it an admin.
    expect(await roleOf(PRIMARY)).toBeUndefined();

    const response = await signIn('google', { sub: 'g-primary', email: PRIMARY, verified: true });

    expect(landingOf(response)).toBe('/admin');
    expect(await roleOf(PRIMARY)).toBe('admin');
  });

  it('sends an unverified admin to the bare email page first, and the mailed link lands there bare too', async () => {
    const first = await signIn('microsoft', { sub: 'ms-admin', email: ADMIN, verified: true });
    expect(landingOf(first)).toBe('/account/email');
    await sql`update users set role = 'admin' where email = ${ADMIN}`;
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

  // The primary admin through a provider that never vouches is the unverified
  // admin in practice: promoted by the link, not at the sign-in.
  it('sends the primary admin through Microsoft to the email page, and its link promotes and lands with no next', async () => {
    const response = await signIn('microsoft', {
      sub: 'ms-primary',
      email: PRIMARY,
      verified: true,
    });
    expect(landingOf(response)).toBe('/account/email');
    expect(await roleOf(PRIMARY)).toBe('user');
    const link = mailedLink();
    expect(callbackOf(link)).toBe('/account/email?verified');

    const followed = await auth.handler(
      new Request(link, { headers: { cookie: cookieHeader(response) } }),
    );

    expect(landingOf(followed)).toBe('/account/email?verified');
    expect(await roleOf(PRIMARY)).toBe('admin');
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
