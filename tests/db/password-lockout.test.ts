import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import postgres from 'postgres';
import { setupServer } from 'msw/node';
import { PROVIDER_CREDENTIALS, cookieHeader, signIn as oauthSignIn } from '../support/oauth';
import { asTouch } from '../support/db/touch-row';
import { importAuth } from '../support/auth-module';
import { get, post, pwnedRange } from '../support/password';
import type { Message } from '@/lib/types';
import type { AuthInstance } from '../support/types';

// Story 72 through Better Auth's real `/sign-in/email`: the per-account lock in DESIGN.md §8, "Passwords", and
// claude-docs/auth/passwords.md, "Lockout". Counts are seeded in SQL rather than reached by a hundred sign-ins.

const send = vi.hoisted(() => vi.fn<(message: Message) => Promise<void>>());
vi.mock('@/lib/mail', () => ({ send }));

const DOMAIN = '@password-lockout.test';
const OWNER = `owner${DOMAIN}`;
const OTHER = `other${DOMAIN}`;
const RIGHT = 'Testwort crowns the eastern hedge';
const WRONG = 'Testwort climbs the western wall';
const NEW = 'Testwort sleeps beneath the elder';

let sql: ReturnType<typeof postgres>;
beforeAll(() => {
  sql = postgres(process.env.DATABASE_URL as string, { onnotice: () => {} });
});
afterAll(async () => {
  await sql.end();
});

const server = setupServer(pwnedRange([], []));
beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

let auth: AuthInstance;
beforeAll(async () => {
  auth = await importAuth(PROVIDER_CREDENTIALS);
});

beforeEach(async () => {
  const mine = sql`select id from users where email like ${`%${DOMAIN}`}`;
  await sql`delete from sign_in_failures where user_id in (${mine})`;
  await sql`delete from workspace_members where user_id in (${mine})`;
  await sql`delete from sessions where user_id in (${mine})`;
  await sql`delete from accounts where user_id in (${mine})`;
  await sql`delete from users where email like ${`%${DOMAIN}`}`;
  await sql`delete from verifications where identifier like 'reset-password:%'`;
  send.mockReset();
});

afterEach(() => {
  vi.useRealTimers();
});

const signIn = (password: string, email = OWNER) =>
  post(auth, '/sign-in/email', { email, password });

async function verifiedAccount(email = OWNER, password = RIGHT) {
  const response = await post(auth, '/sign-up/email', { name: 'Fixture Person', email, password });
  expect(response.status, await response.clone().text()).toBe(200);
  await asTouch(sql, (tx) => tx`update users set email_verified = true where email = ${email}`);
  send.mockReset();
}

/** Puts the account's count at `count`, with no lock, as if that many wrong passwords had come before. */
async function seedFailures(count: number, email = OWNER) {
  await sql`
    insert into sign_in_failures (user_id, count)
    select id, ${count} from users where email = ${email}
    on conflict (user_id) do update set count = excluded.count, locked_until = null, password_disabled = false
  `;
}

async function failureRow(email = OWNER) {
  const [row] = await sql`
    select count, locked_until, password_disabled from sign_in_failures
    where user_id = (select id from users where email = ${email})
  `;
  return row as
    { count: number; locked_until: Date | null; password_disabled: boolean } | undefined;
}

/** Removes the row: what the guard reads, and nothing else. */
async function removeRow(email = OWNER) {
  await sql`delete from sign_in_failures where user_id = (select id from users where email = ${email})`;
}

/** Moves the clock past the lock by moving the lock into the past, so no timer is faked inside scrypt. */
async function expireLock(email = OWNER) {
  await sql`
    update sign_in_failures set locked_until = now() - interval '1 second'
    where user_id = (select id from users where email = ${email})
  `;
}

/** Everything a caller can see of a response but its clock. */
async function observable(response: Response) {
  const headers = [...response.headers.entries()].filter(([name]) => name !== 'date');
  return { status: response.status, headers, body: await response.text() };
}

describe('Story 72: wrong passwords lock the account', () => {
  it('locks for a minute at the fifth wrong password: the right one is refused within it and accepted after', async () => {
    await verifiedAccount();
    await seedFailures(4);
    expect((await signIn(WRONG)).status).toBe(401);

    const row = await failureRow();
    expect(row?.count).toBe(5);
    const minute = row!.locked_until!.getTime() - Date.now();
    expect(minute).toBeGreaterThan(55_000);
    expect(minute).toBeLessThanOrEqual(60_000);
    expect((await signIn(RIGHT)).status).toBe(401);

    await expireLock();
    expect((await signIn(RIGHT)).status).toBe(200);
  });

  it('does not lock below five', async () => {
    await verifiedAccount();
    await seedFailures(3);
    expect((await signIn(WRONG)).status).toBe(401);
    expect((await failureRow())?.locked_until).toBeNull();
    expect((await signIn(RIGHT)).status).toBe(200);
  });

  it.each([
    [10, 5 * 60_000],
    [20, 60 * 60_000],
  ])('locks for longer at the %ith failure', async (count, length) => {
    await verifiedAccount();
    await seedFailures(count - 1);
    expect((await signIn(WRONG)).status).toBe(401);
    const until = (await failureRow())!.locked_until!.getTime() - Date.now();
    expect(until).toBeGreaterThan(length - 5_000);
    expect(until).toBeLessThanOrEqual(length);
  });

  it('disables the password at the hundredth failure until a reset, and the reset signs in', async () => {
    await verifiedAccount();
    await seedFailures(99);
    expect((await signIn(WRONG)).status).toBe(401);
    expect((await failureRow())?.password_disabled).toBe(true);

    await expireLock();
    expect((await signIn(RIGHT)).status).toBe(401);

    expect((await post(auth, '/request-password-reset', { email: OWNER })).status).toBe(200);
    const text = send.mock.calls[send.mock.calls.length - 1][0].text;
    const token = text.match(/\/reset-password\/([^\s\]?]+)/)![1];
    expect((await post(auth, '/reset-password', { token, newPassword: NEW })).status).toBe(200);

    expect(await failureRow()).toBeUndefined();
    expect((await signIn(NEW)).status).toBe(200);
  });

  it('does not count attempts made during a lock', async () => {
    await verifiedAccount();
    await seedFailures(4);
    await signIn(WRONG);
    await signIn(WRONG);
    await signIn(RIGHT);
    expect((await failureRow())?.count).toBe(5);
  });

  it('clears the count on a successful sign-in', async () => {
    await verifiedAccount();
    await seedFailures(3);
    expect((await signIn(RIGHT)).status).toBe(200);
    expect(await failureRow()).toBeUndefined();
  });

  it('is the guard that refuses: the same password signs in once the row is removed', async () => {
    await verifiedAccount();
    await seedFailures(99);
    await signIn(WRONG);
    expect((await signIn(RIGHT)).status).toBe(401);

    await removeRow();
    expect((await signIn(RIGHT)).status).toBe(200);
  });
});

describe('Story 72: a lock is the account’s alone', () => {
  it('leaves another account signing in', async () => {
    await verifiedAccount();
    await verifiedAccount(OTHER);
    await seedFailures(4);
    await signIn(WRONG);
    expect((await signIn(RIGHT)).status).toBe(401);

    expect((await signIn(RIGHT, OTHER)).status).toBe(200);
  });

  it('leaves the same account’s provider sign-in open', async () => {
    await verifiedAccount();
    await seedFailures(99);
    await signIn(WRONG);
    expect((await signIn(RIGHT)).status).toBe(401);

    const response = await oauthSignIn(auth, server, 'google', {
      sub: 'g-password-lockout',
      email: OWNER,
      verified: true,
    });
    const session = await get(auth, '/get-session', cookieHeader(response));
    expect(((await session.json()) as { user?: { email: string } } | null)?.user?.email).toBe(
      OWNER,
    );
  });
});

describe('Story 72: a lock looks like a wrong password', () => {
  it('answers a locked account’s right password exactly as a wrong password and an unknown address', async () => {
    await verifiedAccount();
    await verifiedAccount(OTHER);
    await seedFailures(99);
    await signIn(WRONG);
    // The precondition: the lock is on, and the password it refuses is right.
    expect((await failureRow())?.password_disabled).toBe(true);
    const locked = await observable(await signIn(RIGHT));

    const wrong = await observable(await signIn(WRONG, OTHER));
    const unknown = await observable(await signIn(RIGHT, `nobody${DOMAIN}`));

    expect(locked.status).toBe(401);
    expect(locked).toEqual(wrong);
    expect(locked).toEqual(unknown);

    await removeRow();
    expect((await signIn(RIGHT)).status).toBe(200);
  });
});

describe('Story 72: a wrong current password at a change counts', () => {
  async function signedInCookie(): Promise<string> {
    const response = await signIn(RIGHT);
    expect(response.status, await response.clone().text()).toBe(200);
    return cookieHeader(response);
  }

  const change = (cookie: string, currentPassword: string) =>
    post(auth, '/change-password', { currentPassword, newPassword: NEW }, cookie);

  it('counts a wrong current password as a failure, and locks at the fifth', async () => {
    await verifiedAccount();
    const cookie = await signedInCookie();
    // The precondition: the sign-in that made the session left no count behind.
    expect(await failureRow()).toBeUndefined();
    await seedFailures(4);

    expect((await change(cookie, WRONG)).status).toBe(400);
    const row = await failureRow();
    expect(row?.count).toBe(5);
    expect(row?.locked_until?.getTime()).toBeGreaterThan(Date.now());
    expect((await signIn(RIGHT)).status).toBe(401);
  });

  it('refuses the right current password during a lock as a wrong one, without counting it', async () => {
    await verifiedAccount();
    const cookie = await signedInCookie();
    await seedFailures(4);
    await signIn(WRONG);

    const locked = await change(cookie, RIGHT);
    expect(locked.status).toBe(400);
    expect(((await locked.json()) as { code: string }).code).toBe('INVALID_PASSWORD');
    expect((await failureRow())?.count).toBe(5);

    await removeRow();
    expect((await change(cookie, RIGHT)).status).toBe(200);
  });

  it('clears the count on a change made with the right current password', async () => {
    await verifiedAccount();
    const cookie = await signedInCookie();
    await seedFailures(3);
    expect((await change(cookie, RIGHT)).status).toBe(200);
    expect(await failureRow()).toBeUndefined();
  });
});

describe('Story 72: a reset clears the count', () => {
  it('clears a count below any lock once a reset completes', async () => {
    await verifiedAccount();
    await seedFailures(3);
    expect((await post(auth, '/request-password-reset', { email: OWNER })).status).toBe(200);
    const text = send.mock.calls[send.mock.calls.length - 1][0].text;
    const token = text.match(/\/reset-password\/([^\s\]?]+)/)![1];
    expect((await failureRow())?.count).toBe(3);

    expect((await post(auth, '/reset-password', { token, newPassword: NEW })).status).toBe(200);
    expect(await failureRow()).toBeUndefined();
  });
});
