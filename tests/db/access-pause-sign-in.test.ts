import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import postgres from 'postgres';
import { setupServer } from 'msw/node';
import type { Message } from '@/lib/types';
import { liftUserAccessPause, pauseUserAccess } from '@/modules/identity';
import { timeOutSupportSender } from '@/modules/support';
import {
  ORIGIN,
  PROVIDER_CREDENTIALS,
  cookieHeader,
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
import { noPauseNotifier, PAUSE_MESSAGE } from '../support/email-verification';

// A paused account signs in by every method, through Better Auth's real endpoints, into a view of the site with support in it
// and nothing else: the support form sends, and every other signed-in API call answers ACCESS_PAUSED, through the real
// GraphQL route (claude-docs/design-decisions/m15.52-site-access-pause.md, "A paused user may sign in to reach support"). Pages
// are request-session.test.ts's. The two-factor step's session is made by the same call as a password's.

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
  await sql`truncate support_replies, support_requests, support_timeouts, support_send_counts cascade`;
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

/** One GraphQL operation through the real route, as the browser sends it with `cookie`. */
async function graphql(cookie: string, query: string, variables: Record<string, unknown> = {}) {
  const { POST } = await import('@/app/api/graphql/route');
  const response = await POST(
    new Request(`${ORIGIN}/api/graphql`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-sorrel-client': 'web', cookie },
      body: JSON.stringify({ query, variables }),
    }),
  );
  return (await response.json()) as {
    data?: Record<string, unknown> | null;
    errors?: { message: string; extensions?: { code?: string; pausedUntil?: string | null } }[];
  };
}

const ME = 'query { me { id } }';
const SEND =
  'mutation Send($input: SupportRequestInput!) { sendSupportRequest(input: $input) { id } }';
const REQUEST = {
  about: 'question',
  subject: 'Why is my access paused?',
  message: 'I cannot open my coven.',
};

async function requestsFrom(userId: string): Promise<number> {
  const [{ count }] =
    await sql`select count(*)::int as count from support_requests where created_by = ${userId}`;
  return count as number;
}

/**
 * The paused view, for a cookie that signs in `userId`: the session stands with the pause beside it, the signed-in support
 * form sends, and a call outside support answers ACCESS_PAUSED with the pause's end.
 */
async function expectPausedView(cookie: string, userId: string, until: Date | null) {
  const { sessionStateFromHeaders } = await import('@/lib/request-session');
  const state = await sessionStateFromHeaders(new Headers({ cookie }));
  expect(state.session?.userId).toBe(userId);
  expect(state.accessPause).toEqual({ until });

  const sent = await graphql(cookie, SEND, { input: REQUEST });
  expect(sent.errors).toBeUndefined();
  expect(await requestsFrom(userId)).toBe(1);

  const refused = await graphql(cookie, ME);
  expect(refused.data).toBeNull();
  expect(refused.errors?.[0]?.extensions).toEqual({
    code: 'ACCESS_PAUSED',
    pausedUntil: until?.toISOString() ?? null,
  });
}

/** An unpaused view, for the precondition and the ended pause: the session stands alone, and `me` answers. */
async function expectOpenView(cookie: string, userId: string) {
  const { sessionStateFromHeaders } = await import('@/lib/request-session');
  const state = await sessionStateFromHeaders(new Headers({ cookie }));
  expect(state.session?.userId).toBe(userId);
  expect(state.accessPause).toBeUndefined();
  expect((await graphql(cookie, ME)).data).toEqual({ me: { id: userId } });
}

describe('a paused account signs in by every method, into support alone', () => {
  it('by a provider: ends the session it held, then signs in again to the paused view with the end date', async () => {
    const first = await signInWithProvider(PROVIDER_USER);
    const id = await idOf(PROVIDER_USER);
    // The precondition: the account signs in through the provider, and its session reaches the signed-in API.
    await expectOpenView(cookieHeader(first), id);
    const until = inADay();

    await pauseUserAccess(asUser(E), id, until, 'A fixture pause', noPauseNotifier, PAUSE_MESSAGE);

    expect(await signedInAs(cookieHeader(first))).toBeUndefined();
    const again = await signInWithProvider(PROVIDER_USER);
    expect(again.status).toBe(302);
    expect(await signedInAs(cookieHeader(again))).toBe(id);
    await expectPausedView(cookieHeader(again), id, until);
  });

  it('by a provider, paused with no end: the paused view carries no date', async () => {
    await signInWithProvider(PROVIDER_USER);
    const id = await idOf(PROVIDER_USER);
    await pauseUserAccess(asUser(E), id, null, 'A fixture pause', noPauseNotifier, PAUSE_MESSAGE);

    const again = await signInWithProvider(PROVIDER_USER);

    await expectPausedView(cookieHeader(again), id, null);
  });

  it('by a password: signs in, counts no failure, and reaches the paused view', async () => {
    const id = await passwordAccount();
    const until = inADay();
    await pauseUserAccess(asUser(E), id, until, 'A fixture pause', noPauseNotifier, PAUSE_MESSAGE);

    const signedIn = await signInWithPassword();

    expect(signedIn.status).toBe(200);
    const [{ count }] =
      await sql`select count(*)::int as count from sign_in_failures where user_id = ${id}`;
    expect(count).toBe(0);
    await expectPausedView(cookieHeader(signedIn), id, until);
  });

  it('by a wrong password: still answers as a wrong password', async () => {
    const id = await passwordAccount();
    await pauseUserAccess(asUser(E), id, null, 'A fixture pause', noPauseNotifier, PAUSE_MESSAGE);

    const wrong = await post(auth, '/sign-in/email', {
      email: PASSWORD_USER,
      password: 'Testwort is not the password',
    });

    expect(wrong.status).toBe(401);
    expect(cookieHeader(wrong)).not.toMatch(/session_token=/);
  });

  it('by a passkey: signs in to the paused view, an open-ended pause carrying no end', async () => {
    const { id, key } = await passkeyAccount();
    await pauseUserAccess(asUser(E), id, null, 'A fixture pause', noPauseNotifier, PAUSE_MESSAGE);

    const signedIn = await signInWithPasskey(auth, key);

    expect(signedIn.status).toBe(200);
    await expectPausedView(cookieHeader(signedIn), id, null);
  });

  it('is refused the send by a support time-out, with the time-out’s own sentence', async () => {
    const id = await passwordAccount();
    await pauseUserAccess(asUser(E), id, null, 'A fixture pause', noPauseNotifier, PAUSE_MESSAGE);
    const cookie = cookieHeader(await signInWithPassword());
    // The precondition: the paused session sends, so the time-out, not the pause, refuses the next.
    expect((await graphql(cookie, SEND, { input: REQUEST })).errors).toBeUndefined();

    await timeOutSupportSender(
      asUser(E),
      id,
      inADay(),
      'A fixture time-out',
      noPauseNotifier,
      PAUSE_MESSAGE,
    );

    const refused = await graphql(cookie, SEND, { input: REQUEST });
    expect(refused.errors?.[0]?.extensions?.code).toBe('FORBIDDEN');
    expect(refused.errors?.[0]?.message).toMatch(/^You cannot send support requests until /);
    expect(await requestsFrom(id)).toBe(1);
  });
});

describe('a pause that has ended', () => {
  it('signs a password in to the whole site once until has passed, writing nothing to the pause', async () => {
    const id = await passwordAccount();
    await pauseUserAccess(
      asUser(E),
      id,
      inADay(),
      'A fixture pause',
      noPauseNotifier,
      PAUSE_MESSAGE,
    );
    await sql`update user_access_pauses set until = now() - interval '1 minute' where user_id = ${id}`;
    const [before] = await sql`select * from user_access_pauses where user_id = ${id}`;

    const signedIn = await signInWithPassword();

    expect(signedIn.status).toBe(200);
    await expectOpenView(cookieHeader(signedIn), id);
    expect(await sql`select * from user_access_pauses where user_id = ${id}`).toEqual([before]);
  });

  it('signs a provider in to the whole site once until has passed', async () => {
    await signInWithProvider(PROVIDER_USER);
    const id = await idOf(PROVIDER_USER);
    await pauseUserAccess(
      asUser(E),
      id,
      inADay(),
      'A fixture pause',
      noPauseNotifier,
      PAUSE_MESSAGE,
    );
    await sql`update user_access_pauses set until = now() - interval '1 minute' where user_id = ${id}`;

    const signedIn = await signInWithProvider(PROVIDER_USER);

    await expectOpenView(cookieHeader(signedIn), id);
  });

  it('opens a passkey’s session to the whole site once the pause is lifted, without signing in again', async () => {
    const { id, key } = await passkeyAccount();
    await pauseUserAccess(asUser(E), id, null, 'A fixture pause', noPauseNotifier, PAUSE_MESSAGE);
    const cookie = cookieHeader(await signInWithPasskey(auth, key));
    expect((await graphql(cookie, ME)).errors?.[0]?.extensions?.code).toBe('ACCESS_PAUSED');

    await liftUserAccessPause(asUser(E), id);

    await expectOpenView(cookie, id);
  });
});

describe('a paused account at the compendium', () => {
  it('reads as signed out to the proxy and the public pages, and the proxy lets /compendium through', async () => {
    await signInWithProvider(PROVIDER_USER);
    const id = await idOf(PROVIDER_USER);
    await pauseUserAccess(asUser(E), id, null, 'A fixture pause', noPauseNotifier, PAUSE_MESSAGE);
    const cookie = cookieHeader(await signInWithProvider(PROVIDER_USER));
    const { sessionFromHeaders, sessionStateFromHeaders } = await import('@/lib/request-session');
    const { proxy } = await import('@/proxy');
    // Imported here, not at the top: with Next's server module loaded first, the password endpoints fail Next's
    // "AsyncLocalStorage accessed in runtime where it is not available" invariant.
    const { NextRequest } = await import('next/server');
    const { getRedirectUrl } = await import('next/experimental/testing/server');
    // The precondition: the cookie signs the account in.
    expect((await sessionStateFromHeaders(new Headers({ cookie }))).session?.userId).toBe(id);

    // What a public page reads the viewer through, so the compendium draws its sessionless view
    // (tests/app/(public)/compendium/page.test.tsx, "a visitor with no account").
    expect(await sessionFromHeaders(new Headers({ cookie }))).toBeNull();
    for (const path of ['/compendium', '/compendium/ingredients/testwort']) {
      const passed = await proxy(new NextRequest(`${ORIGIN}${path}`, { headers: { cookie } }));
      expect(getRedirectUrl(passed)).toBeNull();
    }
  });
});
