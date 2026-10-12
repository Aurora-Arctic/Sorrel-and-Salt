import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import postgres from 'postgres';
import { setupServer } from 'msw/node';
import {
  cookieHeader,
  expectSignedIn,
  signIn as signInThrough,
  PROVIDER_CREDENTIALS,
} from '../support/oauth';
import type { Message } from '@/lib/types';
import { importAuth } from '../support/auth-module';
import type { AuthInstance } from '../support/types';

// `account.encryptOAuthTokens` through a real sign-in: the access and refresh
// tokens in `accounts` are unreadable without BETTER_AUTH_SECRET, and a row
// written in plaintext before the switch still reads. The id token is stored as
// issued (claude-docs/auth/config.md, "Config").

const send = vi.hoisted(() => vi.fn<(message: Message) => Promise<void>>());
vi.mock('@/lib/mail', () => ({ send }));

const DOMAIN = '@oauth-token-encryption.test';
const HOLDER = `holder${DOMAIN}`;
// What tests/support/oauth.ts's token endpoints issue.
const ACCESS_TOKEN = 'test-access-token';

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
  await sql`delete from sessions where user_id in (${mine})`;
  await sql`delete from accounts where user_id in (${mine})`;
  await sql`delete from users where email like ${`%${DOMAIN}`}`;
});

async function signedIn(): Promise<string> {
  const callback = await signInThrough(auth, server, 'google', {
    sub: 'google-holder',
    email: HOLDER,
    verified: true,
  });
  expectSignedIn(callback);
  return cookieHeader(callback);
}

async function googleAccount() {
  const [row] = await sql`
    select a.id, a.access_token from accounts a
    join users u on u.id = a.user_id
    where u.email = ${HOLDER} and a.provider_id = 'google'
  `;
  return row as { id: string; access_token: string };
}

/** The token as Better Auth hands it back to a signed-in caller, decrypting what it stored. */
async function accessTokenFor(cookie: string, accountId: string): Promise<string | undefined> {
  const tokens = await auth.api.getAccessToken({
    body: { accountId },
    headers: new Headers({ cookie }),
  });
  return tokens.accessToken;
}

describe('stored OAuth tokens', () => {
  it('are encrypted at sign-in and read back as the provider issued them', async () => {
    const cookie = await signedIn();
    const stored = await googleAccount();

    expect(stored.access_token).toBeTruthy();
    expect(stored.access_token).not.toContain(ACCESS_TOKEN);
    expect(await accessTokenFor(cookie, stored.id)).toBe(ACCESS_TOKEN);
  });

  it('still reads a token written in plaintext before encryption was on', async () => {
    const cookie = await signedIn();
    const { id, access_token } = await googleAccount();
    // Encryption is on, so the read below goes through the decrypting path.
    expect(access_token).not.toContain(ACCESS_TOKEN);
    // Not even-length hex, which is what Better Auth takes for ciphertext.
    await sql`update accounts set access_token = 'ya29.plaintext-before-the-switch' where id = ${id}`;

    expect(await accessTokenFor(cookie, id)).toBe('ya29.plaintext-before-the-switch');
  });
});
