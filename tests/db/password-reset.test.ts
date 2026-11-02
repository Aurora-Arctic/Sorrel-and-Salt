import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import postgres from 'postgres';
import { setupServer } from 'msw/node';
import {
  ORIGIN,
  PROVIDER_CREDENTIALS,
  cookieHeader,
  signIn as oauthSignIn,
} from '../support/oauth';
import { asTouch } from '../support/db/touch-row';
import { importAuth } from '../support/auth-module';
import { get, post, pwnedRange, pwnedUnreachable } from '../support/password';
import type { passwordSetter as PasswordSetterFactory } from '@/lib/password-setter';
import type {
  Forbidden as ForbiddenClass,
  ValidationError as ValidationErrorClass,
} from '@/lib/errors';
import type { setPassword as SetPasswordService } from '@/modules/identity';
import type { Message } from '@/lib/types';
import type { AuthInstance } from '../support/types';

// Story 71 through Better Auth's real endpoints, with the breached-password service stubbed at the network:
// the policy in DESIGN.md §8, "Passwords", and claude-docs/auth/passwords.md, "Reset and change".

const send = vi.hoisted(() => vi.fn<(message: Message) => Promise<void>>());
vi.mock('@/lib/mail', () => ({ send }));

const DOMAIN = '@password-reset.test';
const OWNER = `owner${DOMAIN}`;
const OLD = 'Testwort crowns the eastern hedge';
const NEW = 'Testwort climbs the western wall';
const BREACHED = 'Testwort password breached';
const CHANGED_SUBJECT = 'Your Password Was Changed';

let sql: ReturnType<typeof postgres>;
beforeAll(() => {
  sql = postgres(process.env.DATABASE_URL as string, { onnotice: () => {} });
});
afterAll(async () => {
  await sql.end();
});

const server = setupServer(pwnedRange([BREACHED], []));
beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

let auth: AuthInstance;
// Imported after `importAuth` resets the module registry, so the setter and its errors share this `auth`'s modules.
let passwordSetter: typeof PasswordSetterFactory;
let ValidationError: typeof ValidationErrorClass;
let Forbidden: typeof ForbiddenClass;
let setPassword: typeof SetPasswordService;
beforeAll(async () => {
  auth = await importAuth(PROVIDER_CREDENTIALS);
  ({ passwordSetter } = await import('@/lib/password-setter'));
  ({ ValidationError, Forbidden } = await import('@/lib/errors'));
  ({ setPassword } = await import('@/modules/identity'));
});

beforeEach(async () => {
  await sql`truncate user_privilege_changes`;
  const mine = sql`select id from users where email like ${`%${DOMAIN}`}`;
  await sql`delete from workspace_members where user_id in (${mine})`;
  await sql`delete from sessions where user_id in (${mine})`;
  await sql`delete from accounts where user_id in (${mine})`;
  await sql`delete from users where email like ${`%${DOMAIN}`}`;
  await sql`delete from verifications where identifier like 'reset-password:%'`;
  send.mockReset();
});

const signIn = (password: string, email = OWNER) =>
  post(auth, '/sign-in/email', { email, password });

/** A verified password account, so nothing below is explained by the address being unproved. */
async function verifiedAccount(password = OLD, email = OWNER) {
  const response = await post(auth, '/sign-up/email', { name: 'Fixture Person', email, password });
  expect(response.status, await response.clone().text()).toBe(200);
  await asTouch(sql, (tx) => tx`update users set email_verified = true where email = ${email}`);
  send.mockReset();
}

/** A signed-in session's cookie. */
async function sessionOf(password = OLD, email = OWNER): Promise<string> {
  const response = await signIn(password, email);
  expect(response.status, await response.clone().text()).toBe(200);
  return cookieHeader(response);
}

async function isSignedIn(cookie: string): Promise<boolean> {
  const response = await get(auth, '/get-session', cookie);
  return ((await response.json()) as { user?: unknown } | null)?.user !== undefined;
}

const requestReset = (email = OWNER) => post(auth, '/request-password-reset', { email });

/** The reset link in the one mail sent so far, and the token it carries. */
function mailedResetLink(): { link: string; token: string } {
  expect(send).toHaveBeenCalledTimes(1);
  const link = send.mock.calls[0][0].text.match(/https?:\/\/\S+\/reset-password\/[^\s\]]+/)?.[0];
  if (!link) throw new Error(`no reset link in: ${send.mock.calls[0][0].text}`);
  return { link, token: new URL(link).pathname.split('/').pop()! };
}

async function mailedToken(): Promise<string> {
  expect((await requestReset()).status).toBe(200);
  const { token } = mailedResetLink();
  send.mockReset();
  return token;
}

const reset = (token: string, newPassword = NEW) =>
  post(auth, '/reset-password', { token, newPassword });

const change = (cookie: string, body: Record<string, unknown>) =>
  post(auth, '/change-password', body, cookie);

async function codeOf(response: Response): Promise<string> {
  return ((await response.json()) as { code: string }).code;
}

function noticesTo(email: string): Message[] {
  return send.mock.calls
    .map(([message]) => message)
    .filter((message) => message.to === email && message.subject === CHANGED_SUBJECT);
}

async function hasPassword(email: string): Promise<boolean> {
  const [{ count }] = await sql`
    select count(*)::int from accounts
    where provider_id = 'credential' and password is not null
      and user_id = (select id from users where email = ${email})
  `;
  return count === 1;
}

async function liveSessions(email = OWNER): Promise<number> {
  const [{ count }] = await sql`
    select count(*)::int from sessions where user_id = (select id from users where email = ${email})
  `;
  return count as number;
}

describe('Story 71: asking for a reset', () => {
  it('answers an unknown address exactly as a known one, and mails only the known one', async () => {
    await verifiedAccount();

    const known = await requestReset();
    const unknown = await requestReset(`nobody${DOMAIN}`);

    expect(known.status).toBe(200);
    expect(unknown.status).toBe(known.status);
    expect(await unknown.json()).toEqual(await known.json());
    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0][0].to).toBe(OWNER);
  });

  it('answers an unverified address the same, and mails it nothing, so a reset never reaches an unproved inbox', async () => {
    await verifiedAccount();
    expect((await requestReset()).status).toBe(200);
    // The precondition: a verified account of the same shape is mailed.
    expect(send).toHaveBeenCalledTimes(1);
    send.mockReset();
    await asTouch(sql, (tx) => tx`update users set email_verified = false where email = ${OWNER}`);

    const response = await requestReset();

    expect(response.status).toBe(200);
    expect(send).not.toHaveBeenCalled();
  });

  it('links to the reset page whatever page the request names', async () => {
    await verifiedAccount();

    await post(auth, '/request-password-reset', { email: OWNER, redirectTo: '/coven/elsewhere' });

    const { link } = mailedResetLink();
    expect(link.startsWith(`${ORIGIN}/api/auth/reset-password/`)).toBe(true);
    expect(new URL(link).searchParams.get('callbackURL')).toBe('/reset-password');
  });
});

describe('Story 71: the reset link', () => {
  it('opens the reset page carrying its token, then works once', async () => {
    await verifiedAccount();
    expect((await requestReset()).status).toBe(200);
    const { link, token } = mailedResetLink();

    const opened = await auth.handler(new Request(link));
    expect(opened.status).toBe(302);
    const landing = new URL(opened.headers.get('location')!, ORIGIN);
    expect(landing.pathname).toBe('/reset-password');
    expect(landing.searchParams.get('token')).toBe(token);

    expect((await reset(token)).status).toBe(200);
    const again = await reset(token, 'Testwort tries the same link twice');
    expect(again.status).toBe(400);
    expect(await codeOf(again)).toBe('INVALID_TOKEN');
    expect((await signIn(NEW)).status).toBe(200);
  });

  it('lives 15 minutes', async () => {
    await verifiedAccount();
    const asked = Date.now();
    const token = await mailedToken();

    const [{ expires_at }] = await sql`
      select expires_at from verifications where identifier = ${`reset-password:${token}`}
    `;
    const life = (expires_at as Date).getTime() - asked;
    expect(life).toBeGreaterThan(14 * 60_000);
    expect(life).toBeLessThanOrEqual(15 * 60_000 + 5_000);
  });

  it('is refused once expired, at the page and at the reset, and the password stays', async () => {
    await verifiedAccount();
    const token = await mailedToken();
    await sql`
      update verifications set expires_at = now() - interval '1 second'
      where identifier = ${`reset-password:${token}`}
    `;

    const opened = await get(auth, `/reset-password/${token}?callbackURL=%2Freset-password`);
    expect(opened.status).toBe(302);
    const landing = new URL(opened.headers.get('location')!, ORIGIN);
    expect(landing.pathname).toBe('/reset-password');
    expect(landing.searchParams.get('error')).toBe('INVALID_TOKEN');

    const response = await reset(token);
    expect(response.status).toBe(400);
    expect(await codeOf(response)).toBe('INVALID_TOKEN');
    expect((await signIn(OLD)).status).toBe(200);
  });
});

describe('Story 71: resetting', () => {
  it('signs out every session the account held', async () => {
    await verifiedAccount();
    const first = await sessionOf();
    const second = await sessionOf();
    // The precondition: both sessions are live before the reset.
    expect(await isSignedIn(first)).toBe(true);
    expect(await isSignedIn(second)).toBe(true);

    expect((await reset(await mailedToken())).status).toBe(200);

    expect(await isSignedIn(first)).toBe(false);
    expect(await isSignedIn(second)).toBe(false);
    expect(await liveSessions()).toBe(0);
  });

  it('mails the account a notice that its password changed', async () => {
    await verifiedAccount();
    const token = await mailedToken();

    expect((await reset(token)).status).toBe(200);

    const [notice] = noticesTo(OWNER);
    expect(notice).toBeDefined();
    expect(notice.text).toContain(`${ORIGIN}/forgot-password`);
  });

  it.each([
    ['too short', 'Testwort hedge', 'PASSWORD_TOO_SHORT', 400],
    ['too long', 'Testwort '.repeat(15).slice(0, 129), 'PASSWORD_TOO_LONG', 400],
    ['breached', BREACHED, 'PASSWORD_COMPROMISED', 400],
  ])(
    'refuses a new password that is %s, keeps the link and the old password',
    async (_, password, code, status) => {
      await verifiedAccount();
      const token = await mailedToken();

      const response = await reset(token, password);

      expect(response.status).toBe(status);
      expect(await codeOf(response)).toBe(code);
      expect((await signIn(OLD)).status).toBe(200);
      expect(noticesTo(OWNER)).toHaveLength(0);
      // The link was not spent on the refusal.
      expect((await reset(token)).status).toBe(200);
    },
  );

  it('refuses the reset while the breached list is unreachable, and keeps the old password', async () => {
    await verifiedAccount();
    const token = await mailedToken();
    server.use(pwnedUnreachable());

    const response = await reset(token);

    expect(response.status).toBe(500);
    expect(((await response.json()) as { message: string }).message).toMatch(/try again later/i);
    expect((await signIn(OLD)).status).toBe(200);
  });
});

describe('Story 71: changing a password', () => {
  it('needs the current password, and refuses a wrong one without changing anything', async () => {
    await verifiedAccount();
    const cookie = await sessionOf();

    const response = await change(cookie, {
      currentPassword: 'Testwort is not the password',
      newPassword: NEW,
    });

    expect(response.status).toBe(400);
    expect(await codeOf(response)).toBe('INVALID_PASSWORD');
    expect((await signIn(OLD)).status).toBe(200);
    expect(noticesTo(OWNER)).toHaveLength(0);
  });

  it('signs out every other session and keeps this one, even when the request does not ask it to', async () => {
    await verifiedAccount();
    const other = await sessionOf();
    const mine = await sessionOf();
    // The precondition: the other session is live before the change.
    expect(await isSignedIn(other)).toBe(true);

    const response = await change(mine, {
      currentPassword: OLD,
      newPassword: NEW,
      revokeOtherSessions: false,
    });

    expect(response.status, await response.clone().text()).toBe(200);
    expect(await isSignedIn(other)).toBe(false);
    const kept = cookieHeader(response) || mine;
    expect(await isSignedIn(kept)).toBe(true);
    expect(await liveSessions()).toBe(1);
    expect((await signIn(NEW)).status).toBe(200);
    expect((await signIn(OLD)).status).toBe(401);
  });

  it('mails the account a notice that its password changed', async () => {
    await verifiedAccount();
    const cookie = await sessionOf();

    expect((await change(cookie, { currentPassword: OLD, newPassword: NEW })).status).toBe(200);

    expect(noticesTo(OWNER)).toHaveLength(1);
  });

  it.each([
    ['too short', 'Testwort hedge', 'PASSWORD_TOO_SHORT'],
    ['too long', 'Testwort '.repeat(15).slice(0, 129), 'PASSWORD_TOO_LONG'],
    ['breached', BREACHED, 'PASSWORD_COMPROMISED'],
  ])('refuses a new password that is %s, and keeps the old one', async (_, password, code) => {
    await verifiedAccount();
    const cookie = await sessionOf();

    const response = await change(cookie, { currentPassword: OLD, newPassword: password });

    expect(response.status).toBe(400);
    expect(await codeOf(response)).toBe(code);
    expect((await signIn(OLD)).status).toBe(200);
    expect(noticesTo(OWNER)).toHaveLength(0);
  });

  it('refuses the change while the breached list is unreachable', async () => {
    await verifiedAccount();
    const cookie = await sessionOf();
    server.use(pwnedUnreachable());

    const response = await change(cookie, { currentPassword: OLD, newPassword: NEW });

    expect(response.status).toBe(500);
    expect((await signIn(OLD)).status).toBe(200);
  });
});

describe('Story 71: a provider-only account sets a password', () => {
  const PROVIDER_OWNER = `provider${DOMAIN}`;

  async function providerSession(): Promise<string> {
    const response = await oauthSignIn(auth, server, 'google', {
      sub: 'g-password-reset',
      email: PROVIDER_OWNER,
      verified: true,
    });
    const cookie = cookieHeader(response);
    expect(await isSignedIn(cookie)).toBe(true);
    return cookie;
  }

  const setterFor = (cookie: string) =>
    passwordSetter(new Request(`${ORIGIN}/api/graphql`, { headers: { cookie, origin: ORIGIN } }));

  it('sets one from its session with no current password, then signs in with it, and is mailed', async () => {
    const cookie = await providerSession();
    // The precondition: the account has no password to sign in with.
    expect(await hasPassword(PROVIDER_OWNER)).toBe(false);
    expect((await signIn(NEW, PROVIDER_OWNER)).status).toBe(401);

    await setterFor(cookie).set(NEW);

    expect((await signIn(NEW, PROVIDER_OWNER)).status).toBe(200);
    expect(noticesTo(PROVIDER_OWNER)).toHaveLength(1);
  });

  it.each([
    ['too short', 'Testwort hedge'],
    ['too long', 'Testwort '.repeat(15).slice(0, 129)],
    ['breached', BREACHED],
  ])('refuses a new password that is %s, setting nothing', async (_, password) => {
    const cookie = await providerSession();

    await expect(setterFor(cookie).set(password)).rejects.toBeInstanceOf(ValidationError);

    expect(await hasPassword(PROVIDER_OWNER)).toBe(false);
    expect(noticesTo(PROVIDER_OWNER)).toHaveLength(0);
  });

  it('refuses while the breached list is unreachable, setting nothing', async () => {
    const cookie = await providerSession();
    server.use(pwnedUnreachable());

    await expect(setterFor(cookie).set(NEW)).rejects.toThrow(/try again later/i);

    expect(await hasPassword(PROVIDER_OWNER)).toBe(false);
  });

  it('refuses to set over a password the account already has, which only a change replaces', async () => {
    await verifiedAccount();
    const cookie = await sessionOf();

    await expect(setterFor(cookie).set(NEW)).rejects.toBeInstanceOf(ValidationError);

    expect((await signIn(OLD)).status).toBe(200);
  });

  it('refuses without a session', async () => {
    await expect(passwordSetter(new Request(`${ORIGIN}/api/graphql`)).set(NEW)).rejects.toThrow();
  });

  /** The service's view of the provider account's session. */
  async function serviceSession() {
    const [{ id }] = await sql`select id from users where email = ${PROVIDER_OWNER}`;
    return { userId: id as string, role: 'user' as const };
  }

  it('sets one through the service from a session signed in within the last day', async () => {
    const cookie = await providerSession();

    expect(await setPassword(await serviceSession(), NEW, setterFor(cookie))).toBe(true);

    expect(await hasPassword(PROVIDER_OWNER)).toBe(true);
  });

  it('refuses a session signed in more than a day ago, explaining why, and sets nothing', async () => {
    const cookie = await providerSession();
    // The precondition: the same session is fresh, and a fresh one sets (the test above).
    expect(await setterFor(cookie).sessionIsFresh()).toBe(true);
    await sql`
      update sessions set created_at = now() - interval '25 hours'
      where user_id = (select id from users where email = ${PROVIDER_OWNER})
    `;
    expect(await isSignedIn(cookie)).toBe(true);

    const refusal = setPassword(await serviceSession(), NEW, setterFor(cookie));
    await expect(refusal).rejects.toBeInstanceOf(Forbidden);
    await expect(refusal).rejects.toThrow(/sign in again/i);

    expect(await hasPassword(PROVIDER_OWNER)).toBe(false);
    expect(noticesTo(PROVIDER_OWNER)).toHaveLength(0);
  });
});

describe('Story 71: no periodic change', () => {
  it('signs in with a password set three years ago, and asks for no change', async () => {
    await verifiedAccount();
    await asTouch(
      sql,
      (tx) => tx`
        update accounts set created_at = now() - interval '3 years', updated_at = now() - interval '3 years'
        where provider_id = 'credential' and user_id = (select id from users where email = ${OWNER})
      `,
    );

    const response = await signIn(OLD);

    expect(response.status).toBe(200);
    const body = (await response.json()) as Record<string, unknown>;
    expect(body).not.toHaveProperty('redirect', true);
    expect(await isSignedIn(cookieHeader(response))).toBe(true);
  });
});
