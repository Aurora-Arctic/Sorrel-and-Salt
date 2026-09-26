import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import postgres from 'postgres';
import { setupServer } from 'msw/node';
import { BOOTSTRAP_USER_ID } from '@/db/bootstrap';
import type { Message } from '@/lib/mail';
import {
  ORIGIN,
  cookieHeader,
  expectSignedIn,
  signIn as signInThrough,
  stubProviderCredentials,
  type Profile,
  type ProviderId,
} from '../support/oauth';

// Story 58, through Better Auth's real endpoints: an OAuth sign-up mails a
// link, and following it verifies the address only from a session holding
// that account (claude-docs/auth.md, "First-party verification").

const send = vi.hoisted(() => vi.fn<(message: Message) => Promise<void>>());
vi.mock('@/lib/mail', () => ({ send }));

const DOMAIN = '@email-verification.test';
const OWNER = `owner${DOMAIN}`;
const STRANGER = `stranger${DOMAIN}`;

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
  vi.resetModules();
  ({ auth } = await import('@/lib/auth'));
});

afterEach(() => {
  vi.unstubAllEnvs();
});

const signIn = (provider: ProviderId, profile: Profile) =>
  signInThrough(auth, server, provider, profile);

async function userRow(email: string) {
  const [row] = await sql`
    select id, email_verified, updated_by, updated_at
    from users where email = ${email} and deleted_at is null
  `;
  return row as
    { id: string; email_verified: boolean; updated_by: string; updated_at: Date } | undefined;
}

/**
 * Hands the row's stamp to the bootstrap user, so a write that restamps it is
 * visible: the create hook already stamps a new row as itself, and an assertion
 * that `updated_by` is the user's own id would pass with no update hook at all.
 */
async function restamp(email: string): Promise<void> {
  await sql`update users set updated_by = ${BOOTSTRAP_USER_ID} where email = ${email}`;
}

/** The link in the one verification mail sent so far. */
function mailedLink(): string {
  expect(send).toHaveBeenCalledTimes(1);
  const [message] = send.mock.calls[0];
  const link = message.text.match(/https?:\/\/\S+\/verify-email\?[^\s\]]+/)?.[0];
  if (!link) throw new Error(`no verification link in: ${message.text}`);
  return link;
}

function follow(link: string, cookie?: string): Promise<Response> {
  return auth.handler(new Request(link, { headers: cookie ? { cookie } : {} }));
}

describe('Story 58: sign-up mails a verification link and still signs in', () => {
  it('creates the row unverified, sends one mail through the transport, and issues a session', async () => {
    const response = await signIn('microsoft', { sub: 'ms-1', email: OWNER, verified: true });

    expectSignedIn(response);
    const row = await userRow(OWNER);
    expect(row?.email_verified).toBe(false);
    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0][0]).toMatchObject({ to: OWNER });
    expect(mailedLink()).toMatch(new RegExp(`^${ORIGIN}/api/auth/verify-email\\?token=`));
    // The session is withheld only when a provider requires verification; none does.
    expect(cookieHeader(response)).toMatch(/session_token=/);
    const [{ count }] = await sql`select count(*)::int from sessions where user_id = ${row!.id}`;
    expect(count).toBe(1);
  });

  it('sends nothing for an address the provider already vouched for', async () => {
    expectSignedIn(await signIn('google', { sub: 'g-1', email: OWNER, verified: true }));

    expect((await userRow(OWNER))?.email_verified).toBe(true);
    expect(send).not.toHaveBeenCalled();
  });
});

describe('Story 58: following the link', () => {
  async function signUpUnverified() {
    const response = await signIn('microsoft', { sub: 'ms-2', email: OWNER, verified: true });
    expectSignedIn(response);
    await restamp(OWNER);
    const before = await userRow(OWNER);
    // The preconditions a refusal below could otherwise be explained by.
    expect(before).toMatchObject({ email_verified: false, updated_by: BOOTSTRAP_USER_ID });
    return { cookie: cookieHeader(response), link: mailedLink(), before: before! };
  }

  it('verifies the row and stamps it with its own id, from a session holding that row', async () => {
    const { cookie, link, before } = await signUpUnverified();

    const response = await follow(link, cookie);

    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toBe('/coven');
    expect(await userRow(OWNER)).toMatchObject({ email_verified: true, updated_by: before.id });
  });

  it('refuses from no session and leaves the row unchanged', async () => {
    const { link, before } = await signUpUnverified();

    const response = await follow(link);

    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toBe('/coven?error=SIGN_IN_TO_VERIFY');
    expect(await userRow(OWNER)).toEqual(before);
  });

  it("refuses from another user's session and leaves the row unchanged", async () => {
    const { cookie, link, before } = await signUpUnverified();
    const other = await signIn('google', { sub: 'g-2', email: STRANGER, verified: true });
    expectSignedIn(other);

    const response = await follow(link, cookieHeader(other));

    expect(response.headers.get('location')).toBe('/coven?error=SIGN_IN_TO_VERIFY');
    expect(await userRow(OWNER)).toEqual(before);
    // The same link from the owner's session succeeds, so the token was good
    // and the session is what refused it.
    await follow(link, cookie);
    expect((await userRow(OWNER))?.email_verified).toBe(true);
  });

  it('refuses with 403 when the link carries no callbackURL', async () => {
    const { link, before } = await signUpUnverified();
    const bare = new URL(link);
    bare.searchParams.delete('callbackURL');

    const response = await follow(bare.href);

    expect(response.status).toBe(403);
    expect(await userRow(OWNER)).toEqual(before);
  });

  it('leaves an already-verified row untouched on a second use', async () => {
    const { cookie, link } = await signUpUnverified();
    expect((await follow(link, cookie)).status).toBe(302);
    await restamp(OWNER);
    const verified = await userRow(OWNER);
    expect(verified).toMatchObject({ email_verified: true, updated_by: BOOTSTRAP_USER_ID });

    const response = await follow(link, cookie);

    expect(response.headers.get('location')).toBe('/coven');
    expect(await userRow(OWNER)).toEqual(verified);
  });
});

describe('Story 58: which providers vouch', () => {
  it.each(['facebook', 'microsoft'] as const)(
    'stores a %s profile unverified even when it reports verified',
    async (provider) => {
      expectSignedIn(
        await signIn(provider, { sub: `${provider}-3`, email: OWNER, verified: true }),
      );

      expect((await userRow(OWNER))?.email_verified).toBe(false);
    },
  );

  it.each([
    ['google', true],
    ['google', false],
    ['discord', true],
    ['discord', false],
  ] as const)('keeps %s reporting verified=%s', async (provider, verified) => {
    expectSignedIn(await signIn(provider, { sub: '80351110224678914', email: OWNER, verified }));

    expect((await userRow(OWNER))?.email_verified).toBe(verified);
  });
});

// Every write Better Auth makes to `users` outside the create hook passes
// through `databaseHooks.user.update.before`, which names who made it.
describe('the update hook stamps other Better Auth writes', () => {
  it('stamps a provider that vouches at a later sign-in with the signing-in user', async () => {
    expectSignedIn(await signIn('google', { sub: 'g-4', email: OWNER, verified: false }));
    await restamp(OWNER);
    const { id } = (await userRow(OWNER))!;

    expectSignedIn(await signIn('google', { sub: 'g-4', email: OWNER, verified: true }));

    expect(await userRow(OWNER)).toMatchObject({ email_verified: true, updated_by: id });
  });

  it("stamps /update-user with the session's user", async () => {
    const response = await signIn('google', { sub: 'g-5', email: OWNER, verified: true });
    await restamp(OWNER);
    const { id } = (await userRow(OWNER))!;

    const update = await auth.handler(
      new Request(`${ORIGIN}/api/auth/update-user`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          origin: ORIGIN,
          cookie: cookieHeader(response),
        },
        body: JSON.stringify({ name: 'Renamed Person' }),
      }),
    );

    expect(update.status, await update.clone().text()).toBe(200);
    expect((await userRow(OWNER))?.updated_by).toBe(id);
  });
});
