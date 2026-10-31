import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import postgres from 'postgres';
import { setupServer } from 'msw/node';
import { PROVIDER_CREDENTIALS, cookieHeader } from '../support/oauth';
import { asTouch } from '../support/db/touch-row';
import { importAuth } from '../support/auth-module';
import { get, post, pwnedRange } from '../support/password';
import { totpCode, wrongTotpCode } from '../support/two-factor';
import type { Message } from '@/lib/types';
import type { AuthInstance } from '../support/types';

// Story 75 through Better Auth's real endpoints: an authenticator-app step after a right password, and the
// versioned secrets its stored secret is encrypted under (DESIGN.md §8; claude-docs/auth/two-factor.md).

const send = vi.hoisted(() => vi.fn<(message: Message) => Promise<void>>());
vi.mock('@/lib/mail', () => ({ send }));

const DOMAIN = '@two-factor.test';
const OWNER = `owner${DOMAIN}`;
const PASSWORD = 'Testwort crowns the eastern hedge';
const OLD_SECRET = 'testwort-old-secret-0123456789abcdef0123456789';
const NEW_SECRET = 'testwort-new-secret-0123456789abcdef0123456789';

let sql: ReturnType<typeof postgres>;
beforeAll(() => {
  sql = postgres(process.env.DATABASE_URL as string, { onnotice: () => {} });
});
afterAll(async () => {
  await sql.end();
});

const server = setupServer(pwnedRange([], []));
beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
afterAll(() => server.close());

let auth: AuthInstance;
beforeAll(async () => {
  auth = await importAuth({ ...PROVIDER_CREDENTIALS, BETTER_AUTH_SECRET: OLD_SECRET });
});

beforeEach(async () => {
  const mine = sql`select id from users where email like ${`%${DOMAIN}`}`;
  await sql`delete from workspace_members where user_id in (${mine})`;
  await sql`delete from sessions where user_id in (${mine})`;
  await sql`delete from accounts where user_id in (${mine})`;
  await sql`delete from sign_in_failures where user_id in (${mine})`;
  await sql`delete from users where email like ${`%${DOMAIN}`}`;
  send.mockReset();
});

async function userId(): Promise<string> {
  const [row] = await sql`select id from users where email = ${OWNER}`;
  return (row as { id: string }).id;
}

async function twoFactorEnabled(): Promise<boolean> {
  const [row] = await sql`select two_factor_enabled from users where email = ${OWNER}`;
  return (row as { two_factor_enabled: boolean }).two_factor_enabled;
}

async function sessionCount(): Promise<number> {
  const [row] =
    await sql`select count(*)::int as n from sessions where user_id = ${await userId()}`;
  return (row as { n: number }).n;
}

/** A verified password account, signed in; returns its session cookie. */
async function signedInAccount(on: AuthInstance = auth): Promise<string> {
  const signUp = await post(on, '/sign-up/email', {
    name: 'Fixture Person',
    email: OWNER,
    password: PASSWORD,
  });
  expect(signUp.status, await signUp.clone().text()).toBe(200);
  await asTouch(sql, (tx) => tx`update users set email_verified = true where email = ${OWNER}`);
  const signIn = await post(on, '/sign-in/email', { email: OWNER, password: PASSWORD });
  expect(signIn.status).toBe(200);
  return cookieHeader(signIn);
}

/** Two-factor turned on for a signed-in account, as the account page does it; returns what the page shows once. */
async function enrolled(cookie: string, on: AuthInstance = auth) {
  const enable = await post(on, '/two-factor/enable', { password: PASSWORD }, cookie);
  expect(enable.status, await enable.clone().text()).toBe(200);
  const shown = (await enable.json()) as { totpURI: string; backupCodes: string[] };
  const verify = await post(
    on,
    '/two-factor/verify-totp',
    { code: await totpCode(shown.totpURI) },
    cookie,
  );
  expect(verify.status, await verify.clone().text()).toBe(200);
  expect(await twoFactorEnabled()).toBe(true);
  return { ...shown, cookie: cookieHeader(verify) || cookie };
}

/** A right password on a device holding `device` cookies; returns the answer and the challenge cookie. */
async function passwordStep(on: AuthInstance = auth, device = '') {
  const response = await post(on, '/sign-in/email', { email: OWNER, password: PASSWORD }, device);
  expect(response.status, await response.clone().text()).toBe(200);
  const body = (await response.json()) as { twoFactorRedirect?: boolean; token?: string };
  return { body, challenge: [device, cookieHeader(response)].filter(Boolean).join('; ') };
}

async function signedInAs(cookie: string, on: AuthInstance = auth) {
  const response = await get(on, '/get-session', cookie);
  return ((await response.json()) as { user?: { email: string } } | null)?.user?.email;
}

describe('Story 75: turning two-factor on and off', () => {
  it('refuses to start without the right password', async () => {
    const cookie = await signedInAccount();
    const wrong = await post(
      auth,
      '/two-factor/enable',
      { password: 'Testwort is not it at all' },
      cookie,
    );
    expect(wrong.status).toBe(400);
    const [row] =
      await sql`select count(*)::int as n from two_factors where user_id = ${await userId()}`;
    expect((row as { n: number }).n).toBe(0);
  });

  it('refuses an account with no password, so no account with two-factor on is ever without one', async () => {
    const cookie = await signedInAccount();
    await sql`delete from accounts where user_id = ${await userId()} and provider_id = 'credential'`;
    // Precondition: the session still answers, so the refusal is the missing password's.
    expect(await signedInAs(cookie)).toBe(OWNER);
    const enable = await post(auth, '/two-factor/enable', { password: PASSWORD }, cookie);
    expect(enable.status).toBe(400);
    expect(await twoFactorEnabled()).toBe(false);
  });

  it('turns on only once a code from the app is entered, and shows ten backup codes once', async () => {
    const cookie = await signedInAccount();
    const enable = await post(auth, '/two-factor/enable', { password: PASSWORD }, cookie);
    expect(enable.status).toBe(200);
    const { totpURI, backupCodes } = (await enable.json()) as {
      totpURI: string;
      backupCodes: string[];
    };
    expect(new URL(totpURI).searchParams.get('issuer')).toBe('Sorrel & Salt');
    expect(backupCodes).toHaveLength(10);
    // Started, not on: a wrong code leaves it off.
    expect(await twoFactorEnabled()).toBe(false);
    const wrong = await post(
      auth,
      '/two-factor/verify-totp',
      { code: await wrongTotpCode(totpURI) },
      cookie,
    );
    expect(wrong.status).toBe(401);
    expect(await twoFactorEnabled()).toBe(false);

    const right = await post(
      auth,
      '/two-factor/verify-totp',
      { code: await totpCode(totpURI) },
      cookie,
    );
    expect(right.status).toBe(200);
    expect(await twoFactorEnabled()).toBe(true);
    // The secret and backup codes are stored encrypted, never as shown.
    const [row] =
      await sql`select secret, backup_codes from two_factors where user_id = ${await userId()}`;
    const stored = row as { secret: string; backup_codes: string };
    expect(stored.backup_codes).not.toContain(backupCodes[0]);
    expect(stored.secret).toMatch(/^\$ba\$1\$/);
  });

  it('turns off only with the right password', async () => {
    const { cookie } = await enrolled(await signedInAccount());
    const wrong = await post(
      auth,
      '/two-factor/disable',
      { password: 'Testwort is not it at all' },
      cookie,
    );
    expect(wrong.status).toBe(400);
    expect(await twoFactorEnabled()).toBe(true);

    const right = await post(auth, '/two-factor/disable', { password: PASSWORD }, cookie);
    expect(right.status).toBe(200);
    expect(await twoFactorEnabled()).toBe(false);
    const { body } = await passwordStep();
    expect(body.twoFactorRedirect).toBeUndefined();
  });

  it('turns off only on a fresh session, saying why, even with the right password', async () => {
    const { cookie } = await enrolled(await signedInAccount());
    await sql`
      update sessions set created_at = now() - interval '25 hours' where user_id = ${await userId()}
    `;

    const stale = await post(auth, '/two-factor/disable', { password: PASSWORD }, cookie);
    expect(stale.status).toBe(403);
    expect(((await stale.json()) as { code?: string }).code).toBe('SESSION_NOT_FRESH');
    expect(await twoFactorEnabled()).toBe(true);

    // Precondition: the same request on a fresh session turns it off, so the session's age is what refused it.
    await sql`update sessions set created_at = now() where user_id = ${await userId()}`;
    expect((await post(auth, '/two-factor/disable', { password: PASSWORD }, cookie)).status).toBe(
      200,
    );
    expect(await twoFactorEnabled()).toBe(false);
  });
});

describe('Story 72: a wrong password at a two-factor endpoint counts as a failed sign-in', () => {
  const WRONG = 'Testwort is not it at all';

  async function failureRow() {
    const [row] = await sql`
      select count, locked_until from sign_in_failures where user_id = ${await userId()}
    `;
    return row as { count: number; locked_until: Date | null } | undefined;
  }

  /** A signed-in account with the state each path needs before it reads the password; returns its cookie. */
  async function readyFor(path: string): Promise<string> {
    const cookie = await signedInAccount();
    if (path === '/two-factor/enable') return cookie;
    return (await enrolled(cookie)).cookie;
  }

  it.each([
    '/two-factor/enable',
    '/two-factor/disable',
    '/two-factor/get-totp-uri',
    '/two-factor/generate-backup-codes',
  ])(
    '%s: counts a wrong password, holds the right one during the lock, and clears the count once it is accepted',
    async (path) => {
      const cookie = await readyFor(path);
      await sql`insert into sign_in_failures (user_id, count) values (${await userId()}, 4)`;

      const wrong = await post(auth, path, { password: WRONG }, cookie);
      expect(wrong.status).toBe(400);
      const row = await failureRow();
      expect(row?.count).toBe(5);
      expect(row!.locked_until!.getTime()).toBeGreaterThan(Date.now());

      // The right password during the lock is refused as a pause, not as a wrong password, so the owner is told why.
      const held = await post(auth, path, { password: PASSWORD }, cookie);
      expect(held.status).toBe(400);
      expect(((await held.json()) as { code?: string }).code).toBe('PASSWORD_SIGN_IN_PAUSED');
      expect((await failureRow())?.count).toBe(5);

      // Precondition: once the lock is past, the same right password is accepted, so the lock is what held it.
      await sql`update sign_in_failures set locked_until = now() - interval '1 second'`;
      const right = await post(auth, path, { password: PASSWORD }, cookie);
      expect(right.status, await right.clone().text()).toBe(200);
      expect(await failureRow()).toBeUndefined();
    },
  );
});

describe('Story 75: signing in with two-factor on', () => {
  it('does not sign in on the right password alone, and does on the right code', async () => {
    const { totpURI } = await enrolled(await signedInAccount());
    await sql`delete from sessions where user_id = ${await userId()}`;

    const { body, challenge } = await passwordStep();
    expect(body).toEqual({ twoFactorRedirect: true, twoFactorMethods: ['totp'] });
    expect(await sessionCount()).toBe(0);
    expect(await signedInAs(challenge)).toBeUndefined();

    const verify = await post(
      auth,
      '/two-factor/verify-totp',
      { code: await totpCode(totpURI) },
      challenge,
    );
    expect(verify.status).toBe(200);
    expect(await signedInAs(cookieHeader(verify))).toBe(OWNER);
  });

  it('does not sign in on a wrong code', async () => {
    const { totpURI } = await enrolled(await signedInAccount());
    await sql`delete from sessions where user_id = ${await userId()}`;
    const { challenge } = await passwordStep();

    const verify = await post(
      auth,
      '/two-factor/verify-totp',
      { code: await wrongTotpCode(totpURI) },
      challenge,
    );
    expect(verify.status).toBe(401);
    expect(await sessionCount()).toBe(0);
    expect(await signedInAs(cookieHeader(verify) || challenge)).toBeUndefined();
  });

  it('takes a backup code once', async () => {
    const { backupCodes } = await enrolled(await signedInAccount());
    const first = await passwordStep();
    const used = await post(
      auth,
      '/two-factor/verify-backup-code',
      { code: backupCodes[0] },
      first.challenge,
    );
    expect(used.status).toBe(200);
    expect(await signedInAs(cookieHeader(used))).toBe(OWNER);

    const second = await passwordStep();
    const again = await post(
      auth,
      '/two-factor/verify-backup-code',
      { code: backupCodes[0] },
      second.challenge,
    );
    expect(again.status).toBe(401);
    // Precondition: the challenge itself still works, so the refusal is the spent code's.
    const other = await post(
      auth,
      '/two-factor/verify-backup-code',
      { code: backupCodes[1] },
      second.challenge,
    );
    expect(other.status).toBe(200);
  });

  it('skips the code on a trusted device for the trust period, and asks on any other', async () => {
    const { totpURI } = await enrolled(await signedInAccount());
    const { challenge } = await passwordStep();
    const trusting = await post(
      auth,
      '/two-factor/verify-totp',
      { code: await totpCode(totpURI), trustDevice: true },
      challenge,
    );
    expect(trusting.status).toBe(200);
    const trustCookie = trustCookieOf(trusting);
    const [trust] = await sql`
      select expires_at from verifications where identifier like 'trust-device-%' and value = ${await userId()}
    `;
    const days = ((trust as { expires_at: Date }).expires_at.getTime() - Date.now()) / 86_400_000;
    expect(days).toBeGreaterThan(29.9);
    expect(days).toBeLessThanOrEqual(30);

    const trusted = await passwordStep(auth, trustCookie);
    expect(trusted.body.twoFactorRedirect).toBeUndefined();
    expect(trusted.body.token).toBeTruthy();

    const elsewhere = await passwordStep();
    expect(elsewhere.body.twoFactorRedirect).toBe(true);
  });

  it('counts wrong codes towards a lock of their own, which leaves the password count alone', async () => {
    const { totpURI } = await enrolled(await signedInAccount());
    await sql`delete from sessions where user_id = ${await userId()}`;
    const wrong = await wrongTotpCode(totpURI);
    // Five tries per challenge, ten a lock: two challenges spend the budget.
    for (let round = 0; round < 2; round++) {
      const { challenge } = await passwordStep();
      for (let attempt = 0; attempt < 5; attempt++) {
        const response = await post(auth, '/two-factor/verify-totp', { code: wrong }, challenge);
        expect(response.status).toBe(401);
      }
    }
    const [row] = await sql`
      select failed_verification_count, locked_until from two_factors where user_id = ${await userId()}
    `;
    const lock = row as { failed_verification_count: number; locked_until: Date | null };
    expect(lock.failed_verification_count).toBe(10);
    expect(lock.locked_until!.getTime()).toBeGreaterThan(Date.now() + 14 * 60_000);

    const { challenge } = await passwordStep();
    const right = await post(
      auth,
      '/two-factor/verify-totp',
      { code: await totpCode(totpURI) },
      challenge,
    );
    expect(right.status).toBe(429);
    expect(await sessionCount()).toBe(0);
    // The password lock never heard of the codes.
    const [failures] =
      await sql`select count from sign_in_failures where user_id = ${await userId()}`;
    expect(failures).toBeUndefined();
  });
});

describe('the secret the two-factor rows are encrypted under', () => {
  it('still verifies an enrolment made under the old secret once a new one is added', async () => {
    const { totpURI } = await enrolled(await signedInAccount());
    const rotated = await importAuth({
      ...PROVIDER_CREDENTIALS,
      // The old key stays as `BETTER_AUTH_SECRET` too, which still reads any value written before versions existed.
      BETTER_AUTH_SECRET: OLD_SECRET,
      BETTER_AUTH_SECRETS: `2:${NEW_SECRET},1:${OLD_SECRET}`,
    });
    const { body, challenge } = await passwordStep(rotated);
    expect(body.twoFactorRedirect).toBe(true);
    const verify = await post(
      rotated,
      '/two-factor/verify-totp',
      { code: await totpCode(totpURI) },
      challenge,
    );
    expect(verify.status, await verify.clone().text()).toBe(200);
    expect(await signedInAs(cookieHeader(verify), rotated)).toBe(OWNER);

    // A new enrolment is written under the new version.
    const disable = await post(
      rotated,
      '/two-factor/disable',
      { password: PASSWORD },
      cookieHeader(verify),
    );
    expect(disable.status, await disable.clone().text()).toBe(200);
    const enable = await post(
      rotated,
      '/two-factor/enable',
      { password: PASSWORD },
      cookieHeader(disable) || cookieHeader(verify),
    );
    expect(enable.status, await enable.clone().text()).toBe(200);
    const [row] = await sql`select secret from two_factors where user_id = ${await userId()}`;
    expect((row as { secret: string }).secret).toMatch(/^\$ba\$2\$/);
  });

  it('cannot read it once the old secret is gone, so the test above proves the old key was used', async () => {
    const { totpURI } = await enrolled(await signedInAccount());
    const replaced = await importAuth({
      ...PROVIDER_CREDENTIALS,
      BETTER_AUTH_SECRET: NEW_SECRET,
      BETTER_AUTH_SECRETS: `2:${NEW_SECRET}`,
    });
    const { challenge } = await passwordStep(replaced);
    const verify = await post(
      replaced,
      '/two-factor/verify-totp',
      { code: await totpCode(totpURI) },
      challenge,
    );
    expect(verify.status).not.toBe(200);
    expect(await signedInAs(cookieHeader(verify) || challenge, replaced)).toBeUndefined();
  });
});

/** The trust-device cookie a verification set, as a request header. */
function trustCookieOf(response: Response): string {
  const cookie = cookieHeader(response)
    .split('; ')
    .find((pair) => pair.includes('trust_device'));
  if (!cookie) throw new Error('no trust-device cookie');
  return cookie;
}
