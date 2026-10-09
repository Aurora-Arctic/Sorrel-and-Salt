import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import postgres from 'postgres';
import { setupServer } from 'msw/node';
import { BOOTSTRAP_USER_ID } from '@/db/bootstrap';
import { signInErrorMessage } from '@/lib/sign-in';
import {
  ORIGIN,
  cookieHeader,
  expectSignedIn,
  signIn as signInThrough,
  PROVIDER_CREDENTIALS,
} from '../../../support/oauth';
import type { Message, ProviderId } from '@/lib/types';
import { importAuth } from '../../../support/auth-module';
import type { AuthInstance, Profile } from '../../../support/types';
import type { ProvisionalUserRow } from './types';

// Story 58, through Better Auth's real endpoints: an unverified account lapses
// one verification lifetime after its last mail, and the next OAuth callback
// sweeps it (claude-docs/auth/admin-bootstrap.md, "Provisional accounts").

const send = vi.hoisted(() => vi.fn<(message: Message) => Promise<void>>());
vi.mock('@/lib/mail', () => ({ send }));

const DOMAIN = '@provisional-accounts.test';
const OWNER = `owner${DOMAIN}`;
const BYSTANDER = `bystander${DOMAIN}`;

// One lifetime is an hour; these sit clearly either side of it.
const EXPIRED = '61 minutes';
const INSIDE = '50 minutes';
// The cap from sign-up is three hours, whatever the row's resends.
const PAST_CAP = '181 minutes';
const INSIDE_CAP = '170 minutes';

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

// Provider credentials and nothing else, so one import serves every test.
beforeAll(async () => {
  auth = await importAuth(PROVIDER_CREDENTIALS);
});

beforeEach(async () => {
  const mine = sql`select id from users where email like ${`%${DOMAIN}`}`;
  await sql`update users set updated_by = id where updated_by in (${mine})`;
  await sql`delete from sessions where user_id in (${mine})`;
  await sql`delete from accounts where user_id in (${mine})`;
  await sql`delete from users where email like ${`%${DOMAIN}`}`;

  send.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

const signIn = (provider: ProviderId, profile: Profile) =>
  signInThrough(auth, server, provider, profile);

async function userRow(email: string): Promise<ProvisionalUserRow | undefined> {
  const [row] = await sql`
    select id, email_verified, updated_by, updated_at
    from users where email = ${email} and deleted_at is null
  `;
  return row as ProvisionalUserRow | undefined;
}

async function linkedRows(userId: string) {
  const [{ users, accounts, sessions }] = await sql`
    select
      (select count(*)::int from users where id = ${userId}) as users,
      (select count(*)::int from accounts where user_id = ${userId}) as accounts,
      (select count(*)::int from sessions where user_id = ${userId}) as sessions
  `;
  return { users, accounts, sessions } as { users: number; accounts: number; sessions: number };
}

/**
 * Moves the row's sign-up and last touch back together, as if it happened
 * `by` ago. The `set_updated_at` trigger overwrites any `updated_at` an
 * UPDATE supplies, so it is switched off for this one statement; the worker's
 * database is its own clone, and the transaction holds the lock only for as
 * long as the statement.
 */
async function backdate(userId: string, by: string): Promise<void> {
  await sql.begin(async (tx) => {
    await tx`alter table users disable trigger set_updated_at`;
    await tx`
      update users
      set created_at = now() - ${by}::interval, updated_at = now() - ${by}::interval,
        verification_sent_at = now() - ${by}::interval
      where id = ${userId}
    `;
    await tx`alter table users enable trigger set_updated_at`;
  });
}

/** A Facebook sign-up holding `email` unverified: the squat. */
async function squat(email: string) {
  const response = await signIn('facebook', { sub: 'fb-squatter', email, verified: true });
  expectSignedIn(response);
  const row = await userRow(email);
  // The preconditions every sweep assertion below could otherwise be explained by.
  expect(row?.email_verified).toBe(false);
  expect(await linkedRows(row!.id)).toEqual({ users: 1, accounts: 1, sessions: 1 });
  return { row: row!, cookie: cookieHeader(response) };
}

async function sessionUser(cookie: string): Promise<string | undefined> {
  const response = await auth.handler(
    new Request(`${ORIGIN}/api/auth/get-session`, { headers: { cookie } }),
  );
  const body = (await response.json()) as { user?: { id: string } } | null;
  return body?.user?.id;
}

describe('Story 58: an unverified account lapses so the address owner can sign in', () => {
  it('lets a verified Google sign-in into a fresh account once the squat has expired', async () => {
    const squatter = await squat(OWNER);
    await backdate(squatter.row.id, EXPIRED);

    const response = await signIn('google', { sub: 'g-owner', email: OWNER, verified: true });

    expectSignedIn(response);
    const owner = await userRow(OWNER);
    expect(owner?.id).not.toBe(squatter.row.id);
    expect(owner?.email_verified).toBe(true);
    expect(await sessionUser(cookieHeader(response))).toBe(owner?.id);
  });

  it('refuses the same sign-in with the mapped sentence while the squat is inside its window', async () => {
    const squatter = await squat(OWNER);
    await backdate(squatter.row.id, INSIDE);

    const response = await signIn('google', { sub: 'g-owner', email: OWNER, verified: true });

    expect(response.status).toBe(302);
    const error = new URL(response.headers.get('location')!, ORIGIN).searchParams.get('error');
    expect(error).toBe('account_not_linked');
    expect(signInErrorMessage(error!)).toBe(
      "Sign-in didn't work. If you signed in before with a different provider, sign in that way, then add this one under Account.",
    );
    // The squat is what refused it, and it is still there.
    expect((await userRow(OWNER))?.id).toBe(squatter.row.id);
  });
});

describe('Story 58: what the sweep removes', () => {
  it("removes the expired row's accounts and sessions with it, so its cookie signs nobody in", async () => {
    const squatter = await squat(OWNER);
    expect(await sessionUser(squatter.cookie)).toBe(squatter.row.id);
    await backdate(squatter.row.id, EXPIRED);

    // Any callback sweeps; this one is for an unrelated address.
    expectSignedIn(await signIn('google', { sub: 'g-by', email: BYSTANDER, verified: true }));

    expect(await linkedRows(squatter.row.id)).toEqual({ users: 0, accounts: 0, sessions: 0 });
    expect(await sessionUser(squatter.cookie)).toBeUndefined();
  });

  it('never sweeps a verified row, however old', async () => {
    expectSignedIn(await signIn('google', { sub: 'g-owner', email: OWNER, verified: true }));
    const verified = (await userRow(OWNER))!;
    expect(verified.email_verified).toBe(true);
    await backdate(verified.id, '10 years');

    expectSignedIn(await signIn('google', { sub: 'g-by', email: BYSTANDER, verified: true }));

    expect(await linkedRows(verified.id)).toMatchObject({ users: 1, accounts: 1 });
  });

  it('never sweeps a row no provider can sign in to, like the seeded bootstrap user', async () => {
    const [bootstrap] = await sql`
      select email_verified from users where id = ${BOOTSTRAP_USER_ID}
    `;
    // Unverified and old enough: only the missing `accounts` row keeps it.
    expect(bootstrap.email_verified).toBe(false);
    await backdate(BOOTSTRAP_USER_ID, '10 years');
    const squatter = await squat(OWNER);
    await backdate(squatter.row.id, EXPIRED);

    expectSignedIn(await signIn('google', { sub: 'g-by', email: BYSTANDER, verified: true }));

    expect((await linkedRows(BOOTSTRAP_USER_ID)).users).toBe(1);
    // The same callback did sweep, so the bootstrap row was not skipped by accident.
    expect((await linkedRows(squatter.row.id)).users).toBe(0);
  });

  it('sweeps only at an OAuth callback', async () => {
    const squatter = await squat(OWNER);
    await backdate(squatter.row.id, EXPIRED);

    await auth.handler(new Request(`${ORIGIN}/api/auth/ok`));
    await sessionUser(squatter.cookie);

    expect((await linkedRows(squatter.row.id)).users).toBe(1);
  });

  it('logs a sweep that fails and still completes the sign-in', async () => {
    const squatter = await squat(OWNER);
    await backdate(squatter.row.id, EXPIRED);
    // A row that names the squatter makes its delete a foreign-key violation.
    await sql`update users set updated_by = ${squatter.row.id} where id = ${BOOTSTRAP_USER_ID}`;
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});

    const response = await signIn('google', { sub: 'g-by', email: BYSTANDER, verified: true });

    expectSignedIn(response);
    expect((await linkedRows(squatter.row.id)).users).toBe(1);
    expect(error).toHaveBeenCalledWith(
      expect.stringContaining('provisional-account sweep failed'),
      expect.anything(),
    );
  });
});

describe('Story 58: a resend restarts the window', () => {
  function resend(cookie: string | undefined, email: string): Promise<Response> {
    return auth.handler(
      new Request(`${ORIGIN}/api/auth/send-verification-email`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          origin: ORIGIN,
          ...(cookie ? { cookie } : {}),
        },
        body: JSON.stringify({ email, callbackURL: '/coven' }),
      }),
    );
  }

  async function expiredSignUp() {
    const response = await signIn('microsoft', { sub: 'ms-owner', email: OWNER, verified: true });
    expectSignedIn(response);
    const { id } = (await userRow(OWNER))!;
    await sql`update users set updated_by = ${BOOTSTRAP_USER_ID} where id = ${id}`;
    await backdate(id, EXPIRED);
    const before = (await userRow(OWNER))!;
    expect(before).toMatchObject({ email_verified: false, updated_by: BOOTSTRAP_USER_ID });
    send.mockReset();
    return { id, before, cookie: cookieHeader(response) };
  }

  it('touches the row as its own user and keeps it past what would have been its expiry', async () => {
    const { id, before, cookie } = await expiredSignUp();

    const response = await resend(cookie, OWNER);

    expect(response.status, await response.clone().text()).toBe(200);
    expect(send).toHaveBeenCalledTimes(1);
    const touched = (await userRow(OWNER))!;
    expect(touched.updated_at.getTime()).toBeGreaterThan(before.updated_at.getTime());
    expect(touched.updated_by).toBe(id);

    expectSignedIn(await signIn('google', { sub: 'g-by', email: BYSTANDER, verified: true }));
    expect((await linkedRows(id)).users).toBe(1);
  });

  // Without the cap, a squatter resending from their own session every hour
  // would hold the address for as long as they kept it up.
  describe('the three-hour cap from sign-up', () => {
    async function resentSignUp(age: string) {
      const response = await signIn('microsoft', { sub: 'ms-owner', email: OWNER, verified: true });
      expectSignedIn(response);
      const { id } = (await userRow(OWNER))!;
      await backdate(id, age);
      const before = (await userRow(OWNER))!;
      const resent = await resend(cookieHeader(response), OWNER);
      expect(resent.status, await resent.clone().text()).toBe(200);
      // The resend restarted the hour, so only the cap can sweep it now.
      expect((await userRow(OWNER))!.updated_at.getTime()).toBeGreaterThan(
        before.updated_at.getTime(),
      );
      return id;
    }

    it('sweeps a row three hours after sign-up, however recently it resent', async () => {
      const id = await resentSignUp(PAST_CAP);

      expectSignedIn(await signIn('google', { sub: 'g-by', email: BYSTANDER, verified: true }));

      expect(await linkedRows(id)).toEqual({ users: 0, accounts: 0, sessions: 0 });
    });

    it('keeps a row that resent inside the cap', async () => {
      const id = await resentSignUp(INSIDE_CAP);

      expectSignedIn(await signIn('google', { sub: 'g-by', email: BYSTANDER, verified: true }));

      expect((await linkedRows(id)).users).toBe(1);
    });
  });

  it('refuses a resend from no session, so a stranger can neither mail the address nor keep a squat alive', async () => {
    const { id, before } = await expiredSignUp();

    const response = await resend(undefined, OWNER);

    expect(response.status).toBe(401);
    expect(send).not.toHaveBeenCalled();
    expect(await userRow(OWNER)).toEqual(before);
    expectSignedIn(await signIn('google', { sub: 'g-by', email: BYSTANDER, verified: true }));
    expect((await linkedRows(id)).users).toBe(0);
  });
});
