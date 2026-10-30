import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import postgres from 'postgres';
import { setupServer } from 'msw/node';
import { ORIGIN, PROVIDER_CREDENTIALS, cookieHeader } from '../support/oauth';
import { asTouch } from '../support/db/touch-row';
import { asManualFix } from '../support/db/privileges';
import { importAuth } from '../support/auth-module';
import { get, post, pwnedRange, pwnedUnreachable, sha1Hex } from '../support/password';
import type { Message } from '@/lib/types';
import type { AuthInstance } from '../support/types';

// Story 70 through Better Auth's real endpoints, with the breached-password service stubbed at the network:
// the policy in DESIGN.md §8, "Passwords", and claude-docs/auth/passwords.md.

const send = vi.hoisted(() => vi.fn<(message: Message) => Promise<void>>());
vi.mock('@/lib/mail', () => ({ send }));

const DOMAIN = '@password-sign-in.test';
const OWNER = `owner${DOMAIN}`;
const STRONG = 'Testwort crowns the eastern hedge';
const BREACHED = 'Testwort password breached';

let sql: ReturnType<typeof postgres>;
beforeAll(() => {
  sql = postgres(process.env.DATABASE_URL as string, { onnotice: () => {} });
});
afterAll(async () => {
  await sql.end();
});

// Every request the stub answered, so a test can read what left the server.
const pwnedRequests: Request[] = [];
const server = setupServer(pwnedRange([BREACHED], pwnedRequests));
beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

let auth: AuthInstance;
beforeAll(async () => {
  auth = await importAuth(PROVIDER_CREDENTIALS);
});

beforeEach(async () => {
  await sql`truncate user_privilege_changes`;
  const mine = sql`select id from users where email like ${`%${DOMAIN}`}`;
  await sql`delete from workspace_members where user_id in (${mine})`;
  await sql`delete from sessions where user_id in (${mine})`;
  await sql`delete from accounts where user_id in (${mine})`;
  await sql`delete from users where email like ${`%${DOMAIN}`}`;
  pwnedRequests.length = 0;
  send.mockReset();
});

const signUp = (password: string, email = OWNER, extra: Record<string, unknown> = {}) =>
  post(auth, '/sign-up/email', { name: 'Fixture Person', email, password, ...extra });

const signIn = (password: string, email = OWNER) =>
  post(auth, '/sign-in/email', { email, password });

async function userRow(email: string) {
  const [row] = await sql`
    select id, email_verified, role, can_create_workspace from users
    where email = ${email} and deleted_at is null
  `;
  return row as
    | { id: string; email_verified: boolean; role: string; can_create_workspace: boolean }
    | undefined;
}

async function credentialOf(userId: string) {
  const [row] = await sql`
    select password from accounts where user_id = ${userId} and provider_id = 'credential'
  `;
  return row as { password: string | null } | undefined;
}

/** A verified password account, so a sign-in test is not explained by the address being unproved. */
async function verifiedAccount(password: string, email = OWNER) {
  const response = await signUp(password, email);
  expect(response.status, await response.clone().text()).toBe(200);
  await asTouch(sql, (tx) => tx`update users set email_verified = true where email = ${email}`);
  send.mockReset();
}

/** The link in the one mail sent so far. */
function mailedVerifyLink(): string {
  expect(send).toHaveBeenCalledTimes(1);
  const link = send.mock.calls[0][0].text.match(/https?:\/\/\S+\/verify-email\?[^\s\]]+/)?.[0];
  if (!link) throw new Error(`no verification link in: ${send.mock.calls[0][0].text}`);
  return link;
}

describe('Story 70: the password a sign-up may choose', () => {
  it('refuses a password shorter than 15 characters, and accepts one of exactly 15', async () => {
    const short = await signUp('Testwort hedge');
    expect(short.status).toBe(400);
    expect(((await short.json()) as { code: string }).code).toBe('PASSWORD_TOO_SHORT');
    expect(await userRow(OWNER)).toBeUndefined();

    expect('Testwort hedges'.length).toBe(15);
    expect((await signUp('Testwort hedges')).status).toBe(200);
    expect(await userRow(OWNER)).toBeDefined();
  });

  it('accepts 64 characters and 128, and refuses 129', async () => {
    const of = (length: number) => 'Testwort '.repeat(15).slice(0, length);

    expect((await signUp(of(64), `sixty-four${DOMAIN}`)).status).toBe(200);
    expect((await signUp(of(128), `one-twenty-eight${DOMAIN}`)).status).toBe(200);
    const long = await signUp(of(129), `one-twenty-nine${DOMAIN}`);
    expect(long.status).toBe(400);
    expect(((await long.json()) as { code: string }).code).toBe('PASSWORD_TOO_LONG');
    expect(await userRow(`one-twenty-nine${DOMAIN}`)).toBeUndefined();
  });

  it('accepts spaces, punctuation and non-Latin letters with no digit, capital or symbol rule, and signs in with them', async () => {
    const password = 'ещё одна — ночь; λέξη, 草の根!';
    await verifiedAccount(password);

    const response = await signIn(password);
    expect(response.status, await response.clone().text()).toBe(200);
    expect(cookieHeader(response)).toMatch(/session_token=/);
  });

  it('never truncates: a password differing only after its 72nd character does not sign in', async () => {
    const head = 'Testwort '.repeat(8);
    expect(head.length).toBe(72);
    await verifiedAccount(`${head}first tail`);

    // The precondition: the password as set does sign in.
    expect((await signIn(`${head}first tail`)).status).toBe(200);
    const response = await signIn(`${head}other tail`);
    expect(response.status).toBe(401);
    expect(cookieHeader(response)).not.toMatch(/session_token=/);
  });

  it('refuses a breached password with a reason, sending the service only a five-character hash prefix', async () => {
    const response = await signUp(BREACHED);

    expect(response.status).toBe(400);
    const body = (await response.json()) as { code: string; message: string };
    expect(body.code).toBe('PASSWORD_COMPROMISED');
    expect(body.message).toMatch(/breach/i);
    expect(await userRow(OWNER)).toBeUndefined();

    expect(pwnedRequests).toHaveLength(1);
    const [request] = pwnedRequests;
    const hash = sha1Hex(BREACHED);
    const url = new URL(request.url);
    expect(url.pathname).toBe(`/range/${hash.slice(0, 5)}`);
    expect(url.search).toBe('');
    // Nothing else of the password or its hash leaves: not in the URL, a header or a body.
    const sent = [request.url, ...[...request.headers].flat(), await request.text()].join('\n');
    expect(sent).not.toContain(hash.slice(5));
    expect(sent.toUpperCase()).not.toContain(hash.slice(5, 12));
    expect(sent).not.toContain(BREACHED);
  });

  it('refuses the sign-up when the service is unreachable, saying to try again later, and creates nothing', async () => {
    server.use(pwnedUnreachable());

    const response = await signUp(STRONG);

    expect(response.status).toBe(500);
    expect(((await response.json()) as { message: string }).message).toMatch(/try again later/i);
    expect(await userRow(OWNER)).toBeUndefined();
    expect(send).not.toHaveBeenCalled();
  });

  it('accepts the same password once the service answers again', async () => {
    // The precondition for the test above: the refusal was the outage, not the password.
    expect((await signUp(STRONG)).status).toBe(200);
    expect(pwnedRequests).toHaveLength(1);
  });
});

describe('Story 70: signing up', () => {
  it('creates an unverified row with a hashed credential, mails the verification link, and issues no session', async () => {
    const response = await signUp(STRONG);

    expect(response.status).toBe(200);
    expect(cookieHeader(response)).not.toMatch(/session_token=/);
    const row = await userRow(OWNER);
    expect(row).toMatchObject({ email_verified: false, role: 'user' });
    const credential = await credentialOf(row!.id);
    expect(credential?.password).toBeTruthy();
    expect(credential?.password).not.toContain(STRONG);
    expect(send.mock.calls[0][0]).toMatchObject({ to: OWNER });
    expect(mailedVerifyLink()).toMatch(new RegExp(`^${ORIGIN}/api/auth/verify-email\\?token=`));
  });

  it('gives a new account canCreateWorkspace false and the role user', async () => {
    expect((await signUp(STRONG)).status).toBe(200);

    expect(await userRow(OWNER)).toMatchObject({ role: 'user', can_create_workspace: false });
  });

  it('refuses a sign-up whose body names canCreateWorkspace or role, and makes no row', async () => {
    for (const extra of [{ canCreateWorkspace: true }, { role: 'admin' }]) {
      const response = await signUp(STRONG, OWNER, extra);
      expect(response.status).toBe(400);
      expect(await userRow(OWNER)).toBeUndefined();
    }
  });

  it('answers an address that already has an account exactly as a new one, and mails the holder instead', async () => {
    const fresh = await signUp(STRONG, `fresh${DOMAIN}`);
    await verifiedAccount('Testwort guards the first gate');
    const holder = await userRow(OWNER);
    const before = await credentialOf(holder!.id);

    const again = await signUp(STRONG);

    expect(again.status).toBe(fresh.status);
    expect(await again.json()).toEqual(await fresh.json());
    expect(cookieHeader(again)).toBe(cookieHeader(fresh));
    // The holder's row and password are untouched, and they are told.
    const [{ count }] = await sql`select count(*)::int from users where email = ${OWNER}`;
    expect(count).toBe(1);
    expect(await credentialOf(holder!.id)).toEqual(before);
    expect(send).toHaveBeenCalledTimes(1);
    const [notice] = send.mock.calls[0];
    expect(notice.to).toBe(OWNER);
    expect(notice.text).not.toMatch(/verify-email\?/);
    expect(notice.text).toContain(`${ORIGIN}/sign-in`);
  });

  it('answers the same for an address held by a provider-only account, which gains no password', async () => {
    const id = crypto.randomUUID();
    await asManualFix(
      sql,
      (tx) => tx`
        insert into users (id, name, email, email_verified, created_by, updated_by)
        values (${id}, 'Fixture Person', ${OWNER}, true, ${id}, ${id})
      `,
    );
    const holder = await userRow(OWNER);

    const response = await signUp(STRONG);

    expect(response.status).toBe(200);
    expect(await credentialOf(holder!.id)).toBeUndefined();
    expect(send.mock.calls[0][0].to).toBe(OWNER);
  });

  it('sweeps a lapsed unverified row holding the address, so the sign-up makes a fresh account', async () => {
    expect((await signUp('Testwort squats the address')).status).toBe(200);
    const squat = await userRow(OWNER);
    await asTouch(
      sql,
      (tx) => tx`update users set created_at = now() - interval '4 hours' where id = ${squat!.id}`,
    );
    send.mockReset();

    expect((await signUp(STRONG)).status).toBe(200);

    const row = await userRow(OWNER);
    expect(row?.id).not.toBe(squat!.id);
    expect(mailedVerifyLink()).toMatch(/verify-email\?token=/);
  });
});

describe('Story 70: signing in', () => {
  it('gives a wrong password and an unknown address the same error', async () => {
    await verifiedAccount(STRONG);
    // The precondition: the account exists and its password signs in.
    expect((await signIn(STRONG)).status).toBe(200);

    const wrong = await signIn('Testwort is not the password');
    const unknown = await signIn(STRONG, `nobody${DOMAIN}`);

    expect(wrong.status).toBe(401);
    expect(unknown.status).toBe(wrong.status);
    expect(await unknown.json()).toEqual(await wrong.json());
  });

  it('signs an unverified account in to a session the server holds unverified, which the link then verifies', async () => {
    expect((await signUp(STRONG)).status).toBe(200);
    const link = mailedVerifyLink();

    const response = await signIn(STRONG);

    expect(response.status, await response.clone().text()).toBe(200);
    const cookie = cookieHeader(response);
    const session = (await (await get(auth, '/get-session', cookie)).json()) as {
      user: { emailVerified: boolean };
    };
    expect(session.user.emailVerified).toBe(false);

    // The link, followed in that same browser, proves the address.
    const followed = await auth.handler(new Request(link, { headers: { cookie } }));
    expect(followed.status).toBe(302);
    expect((await userRow(OWNER))?.email_verified).toBe(true);
  });

  it('refuses the link without a session, so a stranger cannot verify a sign-up made on their address', async () => {
    expect((await signUp(STRONG)).status).toBe(200);

    const followed = await auth.handler(new Request(mailedVerifyLink()));

    expect(followed.status).toBe(302);
    expect(new URL(followed.headers.get('location')!, ORIGIN).pathname).toBe('/sign-in');
    expect((await userRow(OWNER))?.email_verified).toBe(false);
  });

  it('records email as the last-used method', async () => {
    await verifiedAccount(STRONG);

    const response = await signIn(STRONG);

    expect(response.headers.getSetCookie().join('\n')).toMatch(/=email(;|$)/m);
  });
});
