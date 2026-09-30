import { existsSync } from 'node:fs';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import postgres from 'postgres';
import { setupServer } from 'msw/node';
import { emailVerificationSender } from '@/lib/email-verification';
import { fromRoot } from '../support/paths';
import {
  EMAIL_PAGE,
  ORIGIN,
  cookieHeader,
  expectSignedIn,
  landingOf,
  signIn as signInThrough,
  stubProviderCredentials,
  type Profile,
  type ProviderId,
} from '../support/oauth';
import type { Message } from '@/lib/types';

// Stories 58 and 59 through Better Auth's real endpoints, with MSW standing in
// for the provider and the transport mocked (claude-docs/auth.md, "First-party
// verification" and "The email page"). Stories 60–62 are MB.58–MB.63 and
// MB.69–MB.70's, and have no test yet.

const send = vi.hoisted(() => vi.fn<(message: Message) => Promise<void>>());
vi.mock('@/lib/mail', () => ({ send }));

const DOMAIN = '@acceptance-email.test';
const OWNER = `owner${DOMAIN}`;
const NEW = `new${DOMAIN}`;

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
    select id, email, email_verified from users where email = ${email} and deleted_at is null
  `;
  return row as { id: string; email: string; email_verified: boolean } | undefined;
}

/** The link in the one mail sent since the last reset. */
function mailedLink(): string {
  expect(send).toHaveBeenCalledTimes(1);
  const link = send.mock.calls[0][0].text.match(/https?:\/\/\S+\/verify-email\?[^\s\]]+/)?.[0];
  if (!link) throw new Error('no verification link in the mail');
  return link;
}

function follow(link: string, cookie?: string): Promise<Response> {
  return auth.handler(new Request(link, { headers: cookie ? { cookie } : {} }));
}

describe('Story 58: Prove I own my email address, whichever provider I signed in with, so the site can trust it.', () => {
  it('mails a link at sign-up through a provider that does not vouch, and following it from that session verifies the address', async () => {
    const response = await signIn('microsoft', { sub: 'ms-58', email: OWNER, verified: true });
    expectSignedIn(response);
    expect(await userRow(OWNER)).toMatchObject({ email_verified: false });
    expect(send.mock.calls[0][0]).toMatchObject({ to: OWNER });

    await follow(mailedLink(), cookieHeader(response));

    expect(await userRow(OWNER)).toMatchObject({ email_verified: true });
  });

  it('refuses the link from a browser not signed in to that account', async () => {
    const response = await signIn('microsoft', { sub: 'ms-58b', email: OWNER, verified: true });
    expectSignedIn(response);

    const refused = await follow(mailedLink());

    // Signed out entirely: to sign in, with nothing from the link in the URL.
    expect(landingOf(refused)).toBe('/sign-in?next=%2Faccount%2Femail&error=sign_in_to_verify');
    expect(await userRow(OWNER)).toMatchObject({ email_verified: false });
  });
});

describe('Story 59: Set or change the email the site knows me by, prefilled from my provider, and have it take effect only once I have proved it is mine.', () => {
  it('has the email page at /account/email, where an unverified sign-in lands', async () => {
    expect(existsSync(fromRoot('src/app/account/email/page.tsx'))).toBe(true);

    const response = await signIn('microsoft', { sub: 'ms-59', email: OWNER, verified: true });

    expect(landingOf(response)).toBe(EMAIL_PAGE);
  });

  it('takes effect only once the mailed link is followed from my session: the row keeps its address until then', async () => {
    const response = await signIn('microsoft', { sub: 'ms-59b', email: OWNER, verified: true });
    expectSignedIn(response);
    const cookie = cookieHeader(response);
    const { id } = (await userRow(OWNER))!;
    send.mockReset();

    const request = new Request(`${ORIGIN}/api/graphql`, { method: 'POST', headers: { cookie } });
    await emailVerificationSender(request).requestChange(OWNER, NEW);

    expect(send.mock.calls[0][0]).toMatchObject({ to: NEW });
    expect(await userRow(OWNER)).toMatchObject({ id, email_verified: false });
    expect(await userRow(NEW)).toBeUndefined();

    await follow(mailedLink(), cookie);

    expect(await userRow(OWNER)).toBeUndefined();
    expect(await userRow(NEW)).toMatchObject({ id, email_verified: true });
  });
});
