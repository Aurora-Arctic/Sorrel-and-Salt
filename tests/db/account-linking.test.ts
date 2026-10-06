import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import postgres from 'postgres';
import { setupServer } from 'msw/node';
import { BOOTSTRAP_USER_ID } from '@/db/bootstrap';
import {
  LINK_LANDING,
  ORIGIN,
  cookieHeader,
  expectSignedIn,
  landingOf,
  link as linkThrough,
  signIn as signInThrough,
  stubProviderCredentials,
} from '../support/oauth';
import type { Message, ProviderId } from '@/lib/types';
import type { Profile } from '../support/types';

// Story 1, through Better Auth's real endpoints: a second provider is added
// from a signed-in session with /link-social, and from then on signs in by its
// account id (claude-docs/auth/admin-bootstrap.md, "Linking a second provider").

const send = vi.hoisted(() => vi.fn<(message: Message) => Promise<void>>());
vi.mock('@/lib/mail', () => ({ send }));

const DOMAIN = '@account-linking.test';
const OWNER = `owner${DOMAIN}`;
const STRANGER = `stranger${DOMAIN}`;
// The Microsoft mailbox of the owner, a different address from their Discord one.
const OWNER_ELSEWHERE = `owner.elsewhere${DOMAIN}`;

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

const link = (
  cookie: string,
  provider: ProviderId,
  profile: Profile,
  options?: Parameters<typeof linkThrough>[5],
) => linkThrough(auth, server, cookie, provider, profile, options);

async function userRow(email: string) {
  const [row] = await sql`
    select id, email, email_verified from users where email = ${email} and deleted_at is null
  `;
  return row as { id: string; email: string; email_verified: boolean } | undefined;
}

async function accountsOf(userId: string) {
  return (await sql`
    select id, provider_id, account_id from accounts where user_id = ${userId} order by provider_id
  `) as unknown as { id: string; provider_id: string; account_id: string }[];
}

/** Who a cookie signs in as, asked of Better Auth rather than read off the table. */
async function sessionUserId(cookie: string): Promise<string | undefined> {
  const session = await auth.api.getSession({ headers: new Headers({ cookie }) });
  return session?.user.id;
}

/** A verified Discord sign-up for `email`: its row and its session. */
async function discordUser(email: string, sub = '1001') {
  const response = await signIn('discord', { sub, email, verified: true });
  expectSignedIn(response);
  const row = await userRow(email);
  expect(row?.email_verified).toBe(true);
  return { row: row!, cookie: cookieHeader(response) };
}

function unlink(cookie: string, accountId: string): Promise<Response> {
  return auth.handler(
    new Request(`${ORIGIN}/api/auth/unlink-account`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: ORIGIN, cookie },
      body: JSON.stringify({ accountId }),
    }),
  );
}

describe('Story 1: adding a second provider from a signed-in session', () => {
  it('links a Microsoft account reporting its address unverified, and a later Microsoft sign-in lands in that user', async () => {
    const owner = await discordUser(OWNER);

    const linked = await link(owner.cookie, 'microsoft', {
      sub: 'ms-owner',
      email: OWNER,
      verified: false,
    });

    expect(linked.status).toBe(302);
    expect(landingOf(linked)).toBe(LINK_LANDING);
    expect((await accountsOf(owner.row.id)).map((account) => account.provider_id)).toEqual([
      'discord',
      'microsoft',
    ]);

    const later = await signIn('microsoft', { sub: 'ms-owner', email: OWNER, verified: false });

    expect(later.status).toBe(302);
    // Not the email page: the row is the Discord-verified one.
    expect(landingOf(later)).toBe('/coven');
    expect(await sessionUserId(cookieHeader(later))).toBe(owner.row.id);
    // The link and the sign-in wrote nothing to the row.
    expect(await userRow(OWNER)).toEqual(owner.row);
  });

  it('links an account carrying a different address, leaving the row on its own', async () => {
    const owner = await discordUser(OWNER);

    const linked = await link(owner.cookie, 'microsoft', {
      sub: 'ms-elsewhere',
      email: OWNER_ELSEWHERE,
      verified: false,
    });

    expect(landingOf(linked)).toBe(LINK_LANDING);
    const later = await signIn('microsoft', {
      sub: 'ms-elsewhere',
      email: OWNER_ELSEWHERE,
      verified: false,
    });
    expect(await sessionUserId(cookieHeader(later))).toBe(owner.row.id);
    expect(await userRow(OWNER)).toEqual(owner.row);
    expect(await userRow(OWNER_ELSEWHERE)).toBeUndefined();
  });

  it('links a Discord account that shared no verified address', async () => {
    const response = await signIn('google', { sub: 'g-owner', email: OWNER, verified: true });
    const cookie = cookieHeader(response);
    const owner = (await userRow(OWNER))!;

    const linked = await link(cookie, 'discord', { sub: '1003', email: null, verified: false });

    expect(landingOf(linked)).toBe(LINK_LANDING);
    expect((await accountsOf(owner.id)).map((account) => account.provider_id)).toEqual([
      'discord',
      'google',
    ]);
    // No placeholder reached the row: a link never rewrites it.
    expect(await userRow(OWNER)).toEqual(owner);
  });

  // The pin this task narrows rather than lifts. The row is present and
  // verified, and the profile is the one the first test links, so the only
  // thing standing between this sign-in and the owner's row is that
  // Microsoft does not vouch outside a link flow.
  it('still refuses the same Microsoft profile at a plain sign-in over that row', async () => {
    const owner = await discordUser(OWNER);

    const response = await signIn('microsoft', { sub: 'ms-owner', email: OWNER, verified: true });

    expect(response.status).toBe(302);
    expect(new URL(landingOf(response), ORIGIN).searchParams.get('error')).toBe(
      'account_not_linked',
    );
    expect(cookieHeader(response)).not.toMatch(/session_token=/);
    expect((await accountsOf(owner.row.id)).map((account) => account.provider_id)).toEqual([
      'discord',
    ]);
  });

  // The link's user is written into the state from the session that started
  // it. Neither the request body nor whichever session finishes the flow
  // names it — both are tried here, pointed at the stranger.
  it('attaches a link to the user who started it, whatever the request names or whose session lands', async () => {
    const owner = await discordUser(OWNER);
    const stranger = await discordUser(STRANGER, '1002');

    const linked = await link(
      owner.cookie,
      'microsoft',
      { sub: 'ms-owner', email: OWNER, verified: false },
      {
        additionalData: { link: { userId: stranger.row.id, email: STRANGER } },
        callbackCookie: stranger.cookie,
      },
    );

    expect(landingOf(linked)).toBe(LINK_LANDING);
    expect((await accountsOf(owner.row.id)).map((account) => account.provider_id)).toEqual([
      'discord',
      'microsoft',
    ]);
    expect((await accountsOf(stranger.row.id)).map((account) => account.provider_id)).toEqual([
      'discord',
    ]);
  });

  it('refuses /link-social without a session', async () => {
    const response = await auth.handler(
      new Request(`${ORIGIN}/api/auth/link-social`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', origin: ORIGIN },
        body: JSON.stringify({ provider: 'microsoft', callbackURL: LINK_LANDING }),
      }),
    );

    expect(response.status).toBe(401);
  });
});

describe('Story 1: removing a linked provider', () => {
  it("removes the row, and that provider's sign-in is refused again", async () => {
    const owner = await discordUser(OWNER);
    await link(owner.cookie, 'microsoft', { sub: 'ms-owner', email: OWNER, verified: false });
    const microsoft = (await accountsOf(owner.row.id)).find(
      (account) => account.provider_id === 'microsoft',
    );
    expect(microsoft).toBeDefined();

    const response = await unlink(owner.cookie, microsoft!.id);

    expect(response.status, await response.clone().text()).toBe(200);
    expect((await accountsOf(owner.row.id)).map((account) => account.provider_id)).toEqual([
      'discord',
    ]);
    const again = await signIn('microsoft', { sub: 'ms-owner', email: OWNER, verified: false });
    expect(new URL(landingOf(again), ORIGIN).searchParams.get('error')).toBe('account_not_linked');
  });

  it('refuses to remove the last provider, and the row survives', async () => {
    const owner = await discordUser(OWNER);
    const [discord] = await accountsOf(owner.row.id);

    const response = await unlink(owner.cookie, discord.id);

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ code: 'FAILED_TO_UNLINK_LAST_ACCOUNT' });
    expect(await accountsOf(owner.row.id)).toEqual([discord]);
  });

  // The stranger holds two providers, so the last-provider refusal cannot be
  // what stops them: it is that the account row is not theirs.
  it("refuses to remove another user's provider, and the row survives", async () => {
    const owner = await discordUser(OWNER);
    const stranger = await discordUser(STRANGER, '1002');
    await link(stranger.cookie, 'google', { sub: 'g-stranger', email: STRANGER, verified: true });
    expect(await accountsOf(stranger.row.id)).toHaveLength(2);
    const [ownersDiscord] = await accountsOf(owner.row.id);

    const response = await unlink(stranger.cookie, ownersDiscord.id);

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ code: 'ACCOUNT_NOT_FOUND' });
    expect(await accountsOf(owner.row.id)).toEqual([ownersDiscord]);
  });
});

// MB.58: the seed's creator row is a plain user, and this is why it can stay
// one — no provider's sign-in lands in it. Better Auth links a sign-in to an
// existing row by address only if that row is verified, and the bootstrap row
// never is; nor has it an `accounts` row to sign in through.
describe("the seed's bootstrap user", () => {
  it.each<ProviderId>(['google', 'discord', 'facebook', 'microsoft'])(
    'refuses a %s sign-in vouching for its address, and attaches nothing to it',
    async (provider) => {
      const [before] = await sql`
        select email, email_verified, role from users where id = ${BOOTSTRAP_USER_ID}
      `;
      // Preconditions: the address finds the row, and the provider vouches for
      // it, as it would for an owner signing in over their own row.
      expect(before).toMatchObject({ email_verified: false, role: 'user' });
      expect(await accountsOf(BOOTSTRAP_USER_ID)).toEqual([]);
      const response = await signIn(provider, {
        // Numeric, as Discord's snowflake ids are; the others take any string.
        sub: '9001',
        email: before.email as string,
        verified: true,
      });

      expect(response.status).toBe(302);
      expect(new URL(landingOf(response), ORIGIN).searchParams.get('error')).toBe(
        'account_not_linked',
      );
      expect(cookieHeader(response)).not.toMatch(/session_token=/);
      expect(await accountsOf(BOOTSTRAP_USER_ID)).toEqual([]);
      const [sessions] = await sql`
        select count(*)::int as count from sessions where user_id = ${BOOTSTRAP_USER_ID}
      `;
      expect(sessions.count).toBe(0);
      const [after] = await sql`
        select email, email_verified, role from users where id = ${BOOTSTRAP_USER_ID}
      `;
      expect(after).toEqual(before);
    },
  );
});
