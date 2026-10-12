import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import postgres from 'postgres';
import { setupServer } from 'msw/node';
import { emailVerificationSender } from '@/lib/email-verification';
import {
  EMAIL_PAGE,
  ORIGIN,
  cookieHeader,
  expectSignedIn,
  landingOf,
  signIn as signInThrough,
  PROVIDER_CREDENTIALS,
} from '../support/oauth';
import type { Message, ProviderId } from '@/lib/types';
import { importAuth } from '../support/auth-module';
import type { AuthInstance, Profile } from '../support/types';
import type { UserRow } from './types';

// Story 59, through Better Auth's real endpoints: an address becomes the
// account's when the mailed change link is followed from a session holding
// the row, and never before — so an established account never re-enters the
// provisional sweep (claude-docs/auth/admin-bootstrap.md, "The email page"). Also where an
// unverified sign-in lands, and what a provider that shares no address gets.

const send = vi.hoisted(() => vi.fn<(message: Message) => Promise<void>>());
vi.mock('@/lib/mail', () => ({ send }));

const DOMAIN = '@email-change.test';
const OWNER = `owner${DOMAIN}`;
const NEW = `new${DOMAIN}`;
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

let auth: AuthInstance;

// Provider credentials and nothing else, so one import serves every test.
beforeAll(async () => {
  auth = await importAuth(PROVIDER_CREDENTIALS);
});

// The harness re-clones per file, not per test; every user here is on this
// domain or under the placeholder's.
beforeEach(async () => {
  const mine = sql`
    select id from users where email like ${`%${DOMAIN}`} or email like '%@pending.invalid'
  `;
  await sql`delete from sessions where user_id in (${mine})`;
  await sql`delete from accounts where user_id in (${mine})`;
  await sql`delete from users where id in (${mine})`;

  send.mockReset();
});

const signIn = (provider: ProviderId, profile: Profile) =>
  signInThrough(auth, server, provider, profile);

async function userRow(email: string): Promise<UserRow | undefined> {
  const [row] = await sql`
    select id, email, email_verified, updated_by, created_at, updated_at, verification_sent_at
    from users where email = ${email} and deleted_at is null
  `;
  return row as UserRow | undefined;
}

/** The sender the email page's mutation uses, bound to the browser's own request. */
function sender(cookie: string) {
  const request = new Request(`${ORIGIN}/api/graphql`, { method: 'POST', headers: { cookie } });
  return emailVerificationSender(request);
}

/** The link in the one mail sent since the last reset. */
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

/** An unverified Microsoft sign-up with its session and its row, the sign-up mail discarded. */
async function signUpUnverified(email = OWNER, sub = 'ms-owner') {
  const response = await signIn('microsoft', { sub, email, verified: true });
  expectSignedIn(response);
  send.mockReset();
  const before = (await userRow(email))!;
  expect(before).toMatchObject({ email, email_verified: false });
  return { cookie: cookieHeader(response), before };
}

/** A change link for `address`, requested from the row's own session, carrying `next` if given. */
async function changeLink(
  cookie: string,
  current: string,
  address = NEW,
  next?: string,
): Promise<string> {
  await sender(cookie).requestChange(current, address, next);
  expect(send.mock.calls[0][0]).toMatchObject({ to: address });
  return mailedLink();
}

describe('Story 59: asking for a new address', () => {
  it("mails the new address, leaves the row as it was, and swaps the address — verified — when the row's own session follows the link", async () => {
    const { cookie, before } = await signUpUnverified();

    const link = await changeLink(cookie, OWNER);

    expect(link).toMatch(new RegExp(`^${ORIGIN}/api/auth/verify-email\\?token=`));
    expect(await userRow(OWNER)).toEqual(before);
    expect(await userRow(NEW)).toBeUndefined();

    const response = await follow(link, cookie);

    expect(response.status).toBe(302);
    expect(landingOf(response)).toBe('/account/email?verified');
    expect(await userRow(OWNER)).toBeUndefined();
    expect(await userRow(NEW)).toMatchObject({
      id: before.id,
      email_verified: true,
      updated_by: before.id,
      // The mail was answered, so the next one is not held back by it.
      verification_sent_at: null,
    });
  });

  it('refuses the link from no session, sending the browser to sign in with no session issued, and leaves the row unchanged', async () => {
    const { cookie, before } = await signUpUnverified();
    const link = await changeLink(cookie, OWNER);

    const response = await follow(link);

    expect(response.status).toBe(302);
    expect(landingOf(response)).toBe('/sign-in?next=%2Faccount%2Femail&error=sign_in_to_verify');
    // Better Auth's own change branch would have signed the opener in.
    expect(cookieHeader(response)).not.toMatch(/session_token=/);
    expect(await userRow(OWNER)).toEqual(before);
    expect(await userRow(NEW)).toBeUndefined();
  });

  it("refuses the link from another user's session, and honours it from the owner's after", async () => {
    const { cookie, before } = await signUpUnverified();
    const link = await changeLink(cookie, OWNER);
    const other = await signIn('google', { sub: 'g-stranger', email: STRANGER, verified: true });
    expectSignedIn(other);

    const response = await follow(link, cookieHeader(other));

    expect(landingOf(response)).toBe('/account/email?error=SIGN_IN_TO_VERIFY');
    expect(await userRow(OWNER)).toEqual(before);
    // The same link from the owner's session succeeds, so the token was good
    // and the session is what refused it.
    await follow(link, cookie);
    expect((await userRow(NEW))?.id).toBe(before.id);
  });

  it('refuses the link when a live account holds the address by the time it is followed', async () => {
    const { cookie, before } = await signUpUnverified();
    const link = await changeLink(cookie, OWNER);
    // Why the refusal could otherwise be explained: the address is now held.
    expectSignedIn(await signIn('google', { sub: 'g-taker', email: NEW, verified: true }));
    expect(await userRow(NEW)).toMatchObject({ email_verified: true });

    const response = await follow(link, cookie);

    expect(landingOf(response)).toBe('/account/email?error=EMAIL_TAKEN');
    expect(await userRow(OWNER)).toEqual(before);
  });

  it('refuses with 403 when the link carries no callbackURL', async () => {
    const { cookie, before } = await signUpUnverified();
    const bare = new URL(await changeLink(cookie, OWNER));
    bare.searchParams.delete('callbackURL');

    const response = await follow(bare.href);

    expect(response.status).toBe(403);
    expect(await userRow(OWNER)).toEqual(before);
  });
});

/** Better Auth's own resend endpoint, posted to directly. */
function resend(
  cookie: string | undefined,
  email: string,
  callbackURL = '/account/email',
): Promise<Response> {
  return auth.handler(
    new Request(`${ORIGIN}/api/auth/send-verification-email`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        origin: ORIGIN,
        ...(cookie ? { cookie } : {}),
      },
      body: JSON.stringify({ email, callbackURL }),
    }),
  );
}

describe('Story 59: one verification mail a minute', () => {
  it("stamps the sign-up mail's clock, sends nothing for a resend inside the minute, and sends and restamps after it", async () => {
    const { cookie, before } = await signUpUnverified();
    expect(before.verification_sent_at).toBeInstanceOf(Date);

    const early = await resend(cookie, OWNER);

    expect(early.status).toBe(200);
    expect(send).not.toHaveBeenCalled();
    expect(await userRow(OWNER)).toEqual(before);

    await sql`update users set verification_sent_at = now() - interval '61 seconds' where id = ${before.id}`;
    const aged = (await userRow(OWNER))!;
    const late = await resend(cookie, OWNER);

    expect(late.status).toBe(200);
    expect(send).toHaveBeenCalledTimes(1);
    const after = (await userRow(OWNER))!;
    expect(after.verification_sent_at!.getTime()).toBeGreaterThan(
      aged.verification_sent_at!.getTime(),
    );
    expect(after.updated_by).toBe(before.id);
  });

  // Better Auth's endpoint takes any address from anyone; here it is the
  // row's own session or nothing, so a stranger can neither mail someone else
  // nor, through the stamp, restart their window.
  it("refuses a resend from no session or another account's session with 401, mailing nothing, and leaves a placeholder unstamped since nothing was mailed", async () => {
    const { before } = await signUpUnverified();
    await sql`update users set verification_sent_at = now() - interval '61 seconds' where id = ${before.id}`;
    const aged = (await userRow(OWNER))!;
    const other = await signIn('google', { sub: 'g-other', email: STRANGER, verified: true });
    expectSignedIn(other);

    expect((await resend(undefined, OWNER)).status).toBe(401);
    expect((await resend(cookieHeader(other), OWNER)).status).toBe(401);

    expect(send).not.toHaveBeenCalled();
    expect(await userRow(OWNER)).toEqual(aged);

    const placeholder = await signIn('discord', {
      sub: '80351110224678914',
      email: null,
      verified: false,
    });
    expectSignedIn(placeholder);
    expect(await userRow('discord-80351110224678914@pending.invalid')).toMatchObject({
      verification_sent_at: null,
    });
  });
});

describe('Story 59: the link carries on to where the account was going', () => {
  const ADMIN_LANDING = '/account/email?verified&next=%2Fadmin';

  const callbackOf = (link: string) => new URL(link).searchParams.get('callbackURL');

  /** Lets the row be mailed again: its sign-up mail was inside the minute. */
  async function outOfCooldown(id: string): Promise<void> {
    await sql`update users set verification_sent_at = now() - interval '61 seconds' where id = ${id}`;
  }

  it('lands a change link on the confirmed view carrying the next it was asked with', async () => {
    const { cookie, before } = await signUpUnverified();

    const link = await changeLink(cookie, OWNER, NEW, '/admin');

    expect(callbackOf(link)).toBe(ADMIN_LANDING);
    expect(landingOf(await follow(link, cookie))).toBe(ADMIN_LANDING);
    expect(await userRow(NEW)).toMatchObject({ id: before.id, email_verified: true });
  });

  it('drops a next that leaves the site when the change link is built, landing as it does today', async () => {
    const { cookie } = await signUpUnverified();

    const link = await changeLink(cookie, OWNER, NEW, '//evil.example');

    expect(callbackOf(link)).toBe('/account/email?verified');
    expect(landingOf(await follow(link, cookie))).toBe('/account/email?verified');
  });

  it('keeps next beside the error when the change link is refused', async () => {
    const { cookie, before } = await signUpUnverified();
    const link = await changeLink(cookie, OWNER, NEW, '/admin');
    expectSignedIn(await signIn('google', { sub: 'g-taker', email: NEW, verified: true }));

    const response = await follow(link, cookie);

    expect(landingOf(response)).toBe('/account/email?next=%2Fadmin&error=EMAIL_TAKEN');
    expect(await userRow(OWNER)).toEqual(before);
  });

  it("lands a resend's link carrying the next the email page asked with", async () => {
    const { cookie, before } = await signUpUnverified();
    await outOfCooldown(before.id);

    await sender(cookie).resend(OWNER, '/admin');

    const link = mailedLink();
    expect(callbackOf(link)).toBe(ADMIN_LANDING);
    expect(landingOf(await follow(link, cookie))).toBe(ADMIN_LANDING);
  });

  // The hook builds every link Better Auth mails, so a callbackURL posted
  // straight to the endpoint passes the same guard as one the sender built.
  it('keeps a same-site next posted straight to the resend endpoint and drops one that leaves the site', async () => {
    const { cookie, before } = await signUpUnverified();
    await outOfCooldown(before.id);

    expect((await resend(cookie, OWNER, ADMIN_LANDING)).status).toBe(200);

    // Why the second could carry it: the hook reads the posted landing's `next`.
    expect(callbackOf(mailedLink())).toBe(ADMIN_LANDING);
    send.mockReset();
    await outOfCooldown(before.id);

    const offsite = await resend(cookie, OWNER, '/account/email?verified&next=%2F%2Fevil.example');

    // Better Auth accepted the landing and mailed; the hook dropped the `next`.
    expect(offsite.status).toBe(200);
    expect(callbackOf(mailedLink())).toBe('/account/email?verified');
  });
});

describe('Story 59: where a sign-in lands', () => {
  it('sends an unverified sign-up to the email page, signed in, and every later unverified sign-in too', async () => {
    const first = await signIn('microsoft', { sub: 'ms-1', email: OWNER, verified: true });

    expect(first.status).toBe(302);
    expect(landingOf(first)).toBe(EMAIL_PAGE);
    expect(cookieHeader(first)).toMatch(/session_token=/);

    const again = await signIn('microsoft', { sub: 'ms-1', email: OWNER, verified: true });

    expect(landingOf(again)).toBe(EMAIL_PAGE);
    expect(cookieHeader(again)).toMatch(/session_token=/);
  });

  it('sends a verified sign-up to its landing, not the email page', async () => {
    const response = await signIn('google', { sub: 'g-1', email: OWNER, verified: true });

    expect(landingOf(response)).toBe('/coven');
  });
});

describe('Story 59: a provider that shares no address', () => {
  const PLACEHOLDER = 'discord-80351110224678914@pending.invalid';

  it('signs the account in under a placeholder, mails nothing, and lands on the email page', async () => {
    const response = await signIn('discord', {
      sub: '80351110224678914',
      email: null,
      verified: false,
    });

    expect(response.status).toBe(302);
    expect(landingOf(response)).toBe(EMAIL_PAGE);
    expect(cookieHeader(response)).toMatch(/session_token=/);
    expect(send).not.toHaveBeenCalled();
    expect(await userRow(PLACEHOLDER)).toMatchObject({ email_verified: false });
  });
});
