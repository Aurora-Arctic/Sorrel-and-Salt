import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import postgres from 'postgres';
import { setupServer } from 'msw/node';
import { LAST_USED_PROVIDER_COOKIE } from '@/lib/sign-in';
import {
  EMAIL_PAGE,
  LINK_LANDING,
  ORIGIN,
  cookieHeader,
  landingOf,
  link as linkThrough,
  providerHandlers,
  signIn as signInThrough,
  stubProviderCredentials,
} from '../support/oauth';
import type { Message, ProviderId } from '@/lib/types';
import type { Profile } from '../support/types';

// Story 1, through Better Auth's real endpoints: the lastLoginMethod plugin
// writes a readable cookie naming the provider whenever a callback sets the
// session, and at no other point (claude-docs/auth.md, "Plugins").

const send = vi.hoisted(() => vi.fn<(message: Message) => Promise<void>>());
vi.mock('@/lib/mail', () => ({ send }));

const DOMAIN = '@last-login-method.test';
const OWNER = `owner${DOMAIN}`;

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

/** The `Set-Cookie` a response writes for `name`, whole, or undefined. */
function setCookie(response: Response, name: string): string | undefined {
  return response.headers.getSetCookie().find((header) => header.startsWith(`${name}=`));
}

/** The provider id a response marks as last used, or undefined when it writes no mark. */
function lastUsedOf(response: Response): string | undefined {
  return setCookie(response, LAST_USED_PROVIDER_COOKIE)?.split(';')[0].split('=')[1];
}

const sessionSet = (response: Response) =>
  setCookie(response, 'better-auth.session_token') !== undefined;

describe('Story 1: the browser remembers the provider it last signed in with', () => {
  it('marks the provider on the callback that signs the browser in, readable by the page', async () => {
    const response = await signIn('google', { sub: 'g-owner', email: OWNER, verified: true });

    expect(landingOf(response)).toBe('/coven');
    expect(sessionSet(response)).toBe(true);
    expect(lastUsedOf(response)).toBe('google');
    // The page reads it from `document.cookie`, which an HttpOnly cookie never reaches.
    expect(setCookie(response, LAST_USED_PROVIDER_COOKIE)).not.toMatch(/httponly/i);
  });

  it('marks nothing when the sign-in only starts', async () => {
    server.use(...providerHandlers('google', { sub: 'g-owner', email: OWNER, verified: true }));

    const start = await auth.handler(
      new Request(`${ORIGIN}/api/auth/sign-in/social`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', origin: ORIGIN },
        body: JSON.stringify({ provider: 'google', callbackURL: '/coven' }),
      }),
    );

    // The start did answer, with the provider's URL and its state cookie.
    expect(start.status).toBe(200);
    expect(start.headers.getSetCookie().length).toBeGreaterThan(0);
    expect(lastUsedOf(start)).toBeUndefined();
  });

  // Our after-hook throws the redirect to the email page; Better Auth runs the
  // plugin's hook after it, with the session cookie already set.
  it('marks the provider on an unverified sign-in redirected to the email page', async () => {
    const response = await signIn('microsoft', { sub: 'ms-owner', email: OWNER, verified: false });

    expect(landingOf(response)).toBe(EMAIL_PAGE);
    expect(sessionSet(response)).toBe(true);
    expect(lastUsedOf(response)).toBe('microsoft');
  });

  // The refusal MB.71's sentence answers: no session, so nothing to remember.
  it('marks nothing on a callback refused with account_not_linked', async () => {
    const first = await signIn('discord', { sub: '1001', email: OWNER, verified: true });
    expect(lastUsedOf(first)).toBe('discord');

    const refused = await signIn('microsoft', { sub: 'ms-owner', email: OWNER, verified: true });

    expect(new URL(landingOf(refused), ORIGIN).searchParams.get('error')).toBe(
      'account_not_linked',
    );
    expect(sessionSet(refused)).toBe(false);
    expect(lastUsedOf(refused)).toBeUndefined();
  });

  // A link sets no session, so the mark stays on the provider signed in with.
  it('marks nothing on a link callback', async () => {
    const signedIn = await signIn('discord', { sub: '1001', email: OWNER, verified: true });

    const linked = await linkThrough(auth, server, cookieHeader(signedIn), 'microsoft', {
      sub: 'ms-owner',
      email: OWNER,
      verified: false,
    });

    expect(landingOf(linked)).toBe(LINK_LANDING);
    const [account] = await sql`
      select provider_id from accounts where provider_id = 'microsoft' and account_id = 'ms-owner'
    `;
    expect(account).toBeDefined();
    expect(lastUsedOf(linked)).toBeUndefined();
  });
});
