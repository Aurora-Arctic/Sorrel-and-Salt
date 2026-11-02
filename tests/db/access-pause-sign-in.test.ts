import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import postgres from 'postgres';
import { setupServer } from 'msw/node';
import { ACCESS_PAUSED_CODE, ACCESS_PAUSED_PATH, accessPausedPath } from '@/lib/access-paused';
import type { Message } from '@/lib/types';
import { liftUserAccessPause, pauseUserAccess } from '@/modules/identity';
import {
  ORIGIN,
  PROVIDER_CREDENTIALS,
  cookieHeader,
  landingOf,
  signIn as signInThrough,
} from '../support/oauth';
import { importAuth } from '../support/auth-module';
import { E, asUser } from '../support/as-user';
import { asManualFix } from '../support/db/privileges';
import { asTouch } from '../support/db/touch-row';
import { post, pwnedRange } from '../support/password';
import { softKey } from '../support/passkey-authenticator';
import { enrol, signInWithPasskey } from '../support/passkey';
import type { AuthInstance } from '../support/types';

// A paused account signs in by no method while the pause stands, and by every method once it runs out or is lifted,
// through Better Auth's real endpoints (claude-docs/auth/admin-bootstrap.md, "Pausing a user's access"). The refusal is the
// session hook in src/lib/auth.ts, which every method's session passes through; the two-factor step's session is made by
// the same call, after a password this file already shows refused.

const send = vi.hoisted(() => vi.fn<(message: Message) => Promise<void>>());
vi.mock('@/lib/mail', () => ({ send }));

const DOMAIN = '@access-pause-sign-in.test';
const PROVIDER_USER = `provider${DOMAIN}`;
const PASSWORD_USER = `password${DOMAIN}`;
const PASSKEY_USER = `passkey${DOMAIN}`;
const PASSWORD = 'Testwort crowns the eastern hedge';

let sql: ReturnType<typeof postgres>;
let auth: AuthInstance;

const server = setupServer(pwnedRange([], []));
beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

beforeAll(async () => {
  sql = postgres(process.env.DATABASE_URL as string, { onnotice: () => {} });
  auth = await importAuth(PROVIDER_CREDENTIALS);
});

afterAll(async () => {
  await sql.end();
});

beforeEach(async () => {
  await sql`truncate user_access_pauses`;
  await sql`truncate user_privilege_changes`;
  const mine = sql`select id from users where email like ${`%${DOMAIN}`}`;
  await sql`delete from sessions where user_id in (${mine})`;
  await sql`delete from accounts where user_id in (${mine})`;
  await sql`delete from passkeys where user_id in (${mine})`;
  await sql`delete from sign_in_failures where user_id in (${mine})`;
  await sql`delete from workspace_members where user_id in (${mine})`;
  await sql`delete from users where email like ${`%${DOMAIN}`}`;
  await asManualFix(sql, async (tx) => {
    await tx`update users set role = 'admin', can_create_workspace = true where id = ${E.id}`;
  });
  send.mockReset();
});

const inADay = () => new Date(Date.now() + 24 * 60 * 60 * 1000);

const signInWithProvider = (email: string) =>
  signInThrough(auth, server, 'google', { sub: `g-${email}`, email, verified: true });

const signInWithPassword = () =>
  post(auth, '/sign-in/email', { email: PASSWORD_USER, password: PASSWORD });

/** The user a response's session cookie signs in, read back through get-session; `undefined` when it signs in nobody. */
async function signedInAs(cookie: string): Promise<string | undefined> {
  const session = await auth.handler(
    new Request(`${ORIGIN}/api/auth/get-session`, { headers: { cookie } }),
  );
  return (await session.json())?.user?.id;
}

async function idOf(email: string): Promise<string> {
  const [{ id }] = await sql<{ id: string }[]>`select id from users where email = ${email}`;
  return id;
}

async function sessionCount(userId: string): Promise<number> {
  const [{ count }] =
    await sql`select count(*)::int as count from sessions where user_id = ${userId}`;
  return count as number;
}

/** A verified password account, signed in once, so a refusal later is not the address or the password. */
async function passwordAccount(): Promise<string> {
  const response = await post(auth, '/sign-up/email', {
    name: 'Fixture Person',
    email: PASSWORD_USER,
    password: PASSWORD,
  });
  expect(response.status, await response.clone().text()).toBe(200);
  await asTouch(
    sql,
    (tx) => tx`update users set email_verified = true where email = ${PASSWORD_USER}`,
  );
  const signedIn = await signInWithPassword();
  expect(signedIn.status, await signedIn.clone().text()).toBe(200);
  return idOf(PASSWORD_USER);
}

/** A verified account holding a passkey, which has signed in with it once. */
async function passkeyAccount() {
  const first = await signInWithProvider(PASSKEY_USER);
  const key = softKey();
  expect((await enrol(auth, cookieHeader(first), key, 'Laptop')).status).toBe(200);
  const id = await idOf(PASSKEY_USER);
  const signedIn = await signInWithPasskey(auth, key);
  expect(await signedInAs(cookieHeader(signedIn))).toBe(id);
  return { id, key };
}

/** A refused fetch's body: the pause's code and end. */
async function refusalOf(response: Response) {
  return (await response.json()) as { code?: string; until?: string | null };
}

describe('a paused account signs in by no method', () => {
  it('by a provider: ends the session it held, and the callback lands on the paused page with the end date and no session', async () => {
    const first = await signInWithProvider(PROVIDER_USER);
    const id = await idOf(PROVIDER_USER);
    // The precondition: the account signs in through the provider.
    expect(await signedInAs(cookieHeader(first))).toBe(id);
    const until = inADay();

    await pauseUserAccess(asUser(E), id, until, null);

    expect(await signedInAs(cookieHeader(first))).toBeUndefined();
    const refused = await signInWithProvider(PROVIDER_USER);
    expect(refused.status).toBe(302);
    expect(landingOf(refused)).toBe(accessPausedPath(until));
    expect(cookieHeader(refused)).not.toMatch(/session_token=/);
    expect(await sessionCount(id)).toBe(0);
  });

  it('by a provider, paused with no end: lands on the paused page carrying no date', async () => {
    await signInWithProvider(PROVIDER_USER);
    await pauseUserAccess(asUser(E), await idOf(PROVIDER_USER), null, null);

    const refused = await signInWithProvider(PROVIDER_USER);

    expect(refused.status).toBe(302);
    expect(landingOf(refused)).toBe(ACCESS_PAUSED_PATH);
  });

  it('by a password: answers 403 with the pause code and its end, sets no session, and counts no failure', async () => {
    const id = await passwordAccount();
    const until = inADay();
    await pauseUserAccess(asUser(E), id, until, null);

    const refused = await signInWithPassword();

    expect(refused.status).toBe(403);
    expect(await refusalOf(refused)).toMatchObject({
      code: ACCESS_PAUSED_CODE,
      until: until.toISOString(),
    });
    expect(cookieHeader(refused)).not.toMatch(/session_token=/);
    expect(await sessionCount(id)).toBe(0);
    const [{ count }] =
      await sql`select count(*)::int as count from sign_in_failures where user_id = ${id}`;
    expect(count).toBe(0);
  });

  it('by a wrong password: still answers as a wrong password, so the refusal tells nobody the account is paused', async () => {
    const id = await passwordAccount();
    await pauseUserAccess(asUser(E), id, null, null);

    const wrong = await post(auth, '/sign-in/email', {
      email: PASSWORD_USER,
      password: 'Testwort is not the password',
    });

    expect(wrong.status).toBe(401);
    expect((await refusalOf(wrong)).code).not.toBe(ACCESS_PAUSED_CODE);
  });

  it('by a passkey: answers 403 with the pause code, an open-ended pause carrying no end, and sets no session', async () => {
    const { id, key } = await passkeyAccount();
    await pauseUserAccess(asUser(E), id, null, null);

    const refused = await signInWithPasskey(auth, key);

    expect(refused.status).toBe(403);
    expect(await refusalOf(refused)).toMatchObject({ code: ACCESS_PAUSED_CODE, until: null });
    expect(cookieHeader(refused)).not.toMatch(/session_token=/);
    expect(await sessionCount(id)).toBe(0);
  });
});

describe('a pause that has ended', () => {
  it('lets every method sign in once until has passed, writing nothing to the pause', async () => {
    const id = await passwordAccount();
    await pauseUserAccess(asUser(E), id, inADay(), null);
    expect((await signInWithPassword()).status).toBe(403);
    await sql`update user_access_pauses set until = now() - interval '1 minute' where user_id = ${id}`;
    const [before] = await sql`select * from user_access_pauses where user_id = ${id}`;

    const signedIn = await signInWithPassword();

    expect(signedIn.status).toBe(200);
    expect(await signedInAs(cookieHeader(signedIn))).toBe(id);
    expect(await sql`select * from user_access_pauses where user_id = ${id}`).toEqual([before]);
  });

  it('lets a provider sign in once until has passed', async () => {
    await signInWithProvider(PROVIDER_USER);
    const id = await idOf(PROVIDER_USER);
    await pauseUserAccess(asUser(E), id, inADay(), null);
    await sql`update user_access_pauses set until = now() - interval '1 minute' where user_id = ${id}`;

    const signedIn = await signInWithProvider(PROVIDER_USER);

    expect(await signedInAs(cookieHeader(signedIn))).toBe(id);
  });

  it('lets a passkey sign in once the pause is lifted', async () => {
    const { id, key } = await passkeyAccount();
    await pauseUserAccess(asUser(E), id, null, null);
    expect((await signInWithPasskey(auth, key)).status).toBe(403);

    await liftUserAccessPause(asUser(E), id);

    const signedIn = await signInWithPasskey(auth, key);
    expect(await signedInAs(cookieHeader(signedIn))).toBe(id);
  });
});

describe('a paused account at the compendium', () => {
  it('is a signed-out visitor: its old cookie reads as no session, and the proxy lets /compendium through', async () => {
    const first = await signInWithProvider(PROVIDER_USER);
    const cookie = cookieHeader(first);
    const { sessionFromHeaders } = await import('@/lib/request-session');
    const { proxy } = await import('@/proxy');
    // Imported here, not at the top: with Next's server module loaded first, the password endpoints fail Next's
    // "AsyncLocalStorage accessed in runtime where it is not available" invariant.
    const { NextRequest } = await import('next/server');
    const { getRedirectUrl } = await import('next/experimental/testing/server');
    // The precondition: before the pause, the page's own session read answers the account.
    expect((await sessionFromHeaders(new Headers({ cookie })))?.userId).toBe(
      await idOf(PROVIDER_USER),
    );

    await pauseUserAccess(asUser(E), await idOf(PROVIDER_USER), null, null);

    // What every page reads the viewer through, so the compendium draws its sessionless view
    // (tests/app/(public)/compendium/page.test.tsx, "a visitor with no account").
    expect(await sessionFromHeaders(new Headers({ cookie }))).toBeNull();
    for (const path of ['/compendium', '/compendium/ingredients/testwort']) {
      const passed = await proxy(new NextRequest(`${ORIGIN}${path}`, { headers: { cookie } }));
      expect(getRedirectUrl(passed)).toBeNull();
      const signedOut = await proxy(new NextRequest(`${ORIGIN}${path}`));
      expect(getRedirectUrl(signedOut)).toBeNull();
    }
  });
});
