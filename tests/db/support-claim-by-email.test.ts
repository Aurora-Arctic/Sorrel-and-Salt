import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import postgres from 'postgres';
import { setupServer } from 'msw/node';
import type { Message } from '@/lib/types';
import { SIGNED_OUT_SENDER_ID } from '@/lib/support-sender';
import { B, E } from '../support/as-user';
import { importAuth } from '../support/auth-module';
import { insertAnonymousUser } from '../support/db/insert-anonymous-user';
import { insertSupportReply, insertSupportRequest } from '../support/db/insert-support-request';
import { asTouch } from '../support/db/touch-row';
import { insertSupportTimeout } from '../support/db/insert-support-timeout';
import { Forbidden } from '@/lib/errors';
import { sendSupportRequest } from '@/modules/support';
import { failureOf } from '../support/db/database';
import { PROVIDER_CREDENTIALS, cookieHeader } from '../support/oauth';
import { post, pwnedRange } from '../support/password';
import type { AuthInstance } from '../support/types';

// Through Better Auth's real endpoints: an account that is not anonymous claims the requests sent signed out from its
// address once it holds a session with that address verified, or verifies it, so a visitor whose anonymous cookie is gone
// still gets back to them (claude-docs/design-decisions/m15.48-anonymous-sender.md, "Claim by verified email").

const send = vi.hoisted(() => vi.fn<(message: Message) => Promise<void>>());
vi.mock('@/lib/mail', () => ({ send }));
const startJob = vi.hoisted(() => vi.fn(async (..._args: unknown[]) => 'run-id'));
vi.mock('@/lib/jobs', () => ({ startJob }));
vi.stubEnv('MAIL_TRANSPORT', '');

const DOMAIN = '@support-claim.test';
const CLAIMER = `claimer${DOMAIN}`;
// The address as the visitor typed it on the form: the claim compares lower-cased.
const AS_TYPED = `Claimer${DOMAIN.toUpperCase()}`;
const PASSWORD = 'Testwort climbs the northern wall';

let sql: ReturnType<typeof postgres>;
let auth: AuthInstance;

const server = setupServer(pwnedRange([], []));
beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

beforeAll(async () => {
  sql = postgres(process.env.DATABASE_URL as string, { onnotice: () => {} });
  auth = await importAuth(PROVIDER_CREDENTIALS);
});

afterAll(async () => {
  await sql.end();
});

beforeEach(async () => {
  await sql`truncate support_replies, support_requests, support_timeouts, support_send_counts cascade`;
  await sql`truncate user_privilege_changes`;
  const mine = sql`select id from users where email like ${`%${DOMAIN}`} or is_anonymous`;
  await sql`delete from sessions where user_id in (${mine})`;
  await sql`delete from accounts where user_id in (${mine})`;
  await sql`delete from workspace_members where user_id in (${mine})`;
  await sql`delete from users where email like ${`%${DOMAIN}`} or is_anonymous`;
  send.mockReset();
});

/** A password sign-up for CLAIMER, which signs it in unverified; returns its id and its cookie. */
async function signUp() {
  const response = await post(auth, '/sign-up/email', {
    name: 'Fixture Person',
    email: CLAIMER,
    password: PASSWORD,
  });
  expect(response.status, await response.clone().text()).toBe(200);
  const [{ id }] = await sql<{ id: string }[]>`select id from users where email = ${CLAIMER}`;
  return { id, cookie: cookieHeader(response) };
}

/** The verification link the sign-up mailed. */
function mailedLink(): string {
  const link = send.mock.calls
    .map(([message]) => message.text.match(/https?:\/\/\S+\/verify-email\?[^\s\]]+/)?.[0])
    .find(Boolean);
  if (!link) throw new Error('no verification link was mailed');
  return link;
}

/** Requests from the claimer's address by both kinds of signed-out sender, each with a sender reply and a staff reply. */
async function signedOutRequests() {
  const anonymousId = await insertAnonymousUser(sql);
  const fromAnonymous = await insertSupportRequest(sql, {
    createdBy: anonymousId,
    senderEmail: AS_TYPED,
    subject: 'Sent from an anonymous session',
  });
  const fromSignedOut = await insertSupportRequest(sql, {
    createdBy: SIGNED_OUT_SENDER_ID,
    senderEmail: CLAIMER,
    subject: 'Sent before anonymous sessions',
  });
  for (const [requestId, sender] of [
    [fromAnonymous, anonymousId],
    [fromSignedOut, SIGNED_OUT_SENDER_ID],
  ] as const) {
    await insertSupportReply(sql, requestId, {
      role: 'staff',
      createdBy: E.id,
      body: 'Which jar?',
    });
    await insertSupportReply(sql, requestId, {
      role: 'sender',
      createdBy: sender,
      body: 'Testwort.',
    });
  }
  // A mailed link stands on each, which the claim must spend.
  await sql`update support_requests set view_token_hash = md5(id::text) where id in (${fromAnonymous}, ${fromSignedOut})`;
  // Another visitor's, from another address: it never moves.
  const otherAnonymous = await insertAnonymousUser(sql);
  const elsewhere = await insertSupportRequest(sql, {
    createdBy: otherAnonymous,
    senderEmail: `someone-else${DOMAIN}`,
  });
  // A signed-in sender's own: owned by a real account, it never moves.
  const owned = await insertSupportRequest(sql, { createdBy: B.id });
  return { anonymousId, otherAnonymous, fromAnonymous, fromSignedOut, elsewhere, owned };
}

const requestRow = async (id: string) =>
  (
    await sql`select created_by, updated_by, sender_email from support_requests where id = ${id}`
  )[0];
const repliesOf = async (id: string) =>
  sql`select author_role, created_by from support_replies where request_id = ${id} order by author_role`;

describe('an account claiming the requests sent signed out from its address', () => {
  it('claims them at sign-in once verified: the requests and the sender’s replies move, audited as it', async () => {
    const { id: claimerId } = await signUp();
    await asTouch(sql, (tx) => tx`update users set email_verified = true where id = ${claimerId}`);
    const rows = await signedOutRequests();
    // Preconditions: the claimer is a real, verified account, and nothing is its yet.
    expect(
      (await sql`select is_anonymous, email_verified from users where id = ${claimerId}`)[0],
    ).toEqual({ is_anonymous: false, email_verified: true });
    expect(await sql`select 1 from support_requests where created_by = ${claimerId}`).toHaveLength(
      0,
    );

    const signedIn = await post(auth, '/sign-in/email', { email: CLAIMER, password: PASSWORD });
    expect(signedIn.status, await signedIn.clone().text()).toBe(200);

    for (const id of [rows.fromAnonymous, rows.fromSignedOut]) {
      expect(await requestRow(id)).toEqual({
        created_by: claimerId,
        updated_by: claimerId,
        sender_email: null,
      });
      expect(await repliesOf(id)).toEqual([
        { author_role: 'sender', created_by: claimerId },
        { author_role: 'staff', created_by: E.id },
      ]);
    }
    // The claim spends the mailed links, so an old link never writes as the real account.
    expect(
      await sql`select view_token_hash from support_requests where id in (${rows.fromAnonymous}, ${rows.fromSignedOut})`,
    ).toEqual([{ view_token_hash: null }, { view_token_hash: null }]);
    expect(await requestRow(rows.elsewhere)).toMatchObject({
      created_by: rows.otherAnonymous,
      sender_email: `someone-else${DOMAIN}`,
    });
    expect(await requestRow(rows.owned)).toMatchObject({ created_by: B.id, updated_by: B.id });
  });

  it('claims nothing while unverified, and claims them when it verifies the address', async () => {
    const { id: claimerId, cookie } = await signUp();
    const rows = await signedOutRequests();
    // Precondition: the sign-up left a live, unverified session, which is when an unverified account would claim.
    expect(
      (await sql`select email_verified from users where id = ${claimerId}`)[0]?.email_verified,
    ).toBe(false);
    expect(await sql`select 1 from sessions where user_id = ${claimerId}`).not.toHaveLength(0);
    const unverifiedSignIn = await post(auth, '/sign-in/email', {
      email: CLAIMER,
      password: PASSWORD,
    });
    expect(unverifiedSignIn.status).toBe(200);

    expect(await sql`select 1 from support_requests where created_by = ${claimerId}`).toHaveLength(
      0,
    );
    expect(await requestRow(rows.fromSignedOut)).toMatchObject({
      created_by: SIGNED_OUT_SENDER_ID,
      sender_email: CLAIMER,
    });
    expect(await requestRow(rows.fromAnonymous)).toMatchObject({ created_by: rows.anonymousId });

    const verified = await auth.handler(new Request(mailedLink(), { headers: { cookie } }));
    expect(verified.status).toBeLessThan(400);
    expect(
      (await sql`select email_verified from users where id = ${claimerId}`)[0]?.email_verified,
    ).toBe(true);

    for (const id of [rows.fromAnonymous, rows.fromSignedOut]) {
      expect(await requestRow(id)).toEqual({
        created_by: claimerId,
        updated_by: claimerId,
        sender_email: null,
      });
    }
    expect(await requestRow(rows.owned)).toMatchObject({ created_by: B.id });
  });

  it('leaves another anonymous visitor’s request alone when the claimer’s address is only part of its address', async () => {
    const { id: claimerId } = await signUp();
    await asTouch(sql, (tx) => tx`update users set email_verified = true where id = ${claimerId}`);
    const anonymousId = await insertAnonymousUser(sql);
    const near = await insertSupportRequest(sql, {
      createdBy: anonymousId,
      senderEmail: `x${CLAIMER}`,
    });

    expect(
      (await post(auth, '/sign-in/email', { email: CLAIMER, password: PASSWORD })).status,
    ).toBe(200);

    expect(await requestRow(near)).toMatchObject({
      created_by: anonymousId,
      sender_email: `x${CLAIMER}`,
    });
  });
});

// A keeper's time-out names the anonymous account; claiming its requests by address must not leave the time-out behind.
describe('an account claiming a timed-out anonymous sender’s requests', () => {
  it('takes the time-out with them, and its own send is refused', async () => {
    const { id: claimerId } = await signUp();
    await asTouch(sql, (tx) => tx`update users set email_verified = true where id = ${claimerId}`);
    const rows = await signedOutRequests();
    const timeout = await insertSupportTimeout(sql, rows.anonymousId);
    const othersTimeout = await insertSupportTimeout(sql, rows.otherAnonymous);
    // Preconditions: the claimer stands under no time-out, so a refusal below is the one it took over.
    expect(await sql`select 1 from support_timeouts where user_id = ${claimerId}`).toHaveLength(0);

    const signedIn = await post(auth, '/sign-in/email', { email: CLAIMER, password: PASSWORD });
    expect(signedIn.status, await signedIn.clone().text()).toBe(200);
    // The claim ran: the anonymous sender's request is the claimer's.
    expect(await requestRow(rows.fromAnonymous)).toMatchObject({ created_by: claimerId });

    expect(await sql`select user_id from support_timeouts where id = ${timeout}`).toEqual([
      { user_id: claimerId },
    ]);
    // Another visitor's time-out, whose requests were not claimed, stays on that visitor.
    expect(await sql`select user_id from support_timeouts where id = ${othersTimeout}`).toEqual([
      { user_id: rows.otherAnonymous },
    ]);
    const before = (await sql`select 1 from support_requests where created_by = ${claimerId}`)
      .length;
    const refusal = await failureOf(
      sendSupportRequest(
        { userId: claimerId, role: 'user' },
        { about: 'account', subject: 'After the claim', message: 'It still sticks.' },
        { origin: async () => 'http://localhost:3000' },
      ),
    );
    expect(refusal).toBeInstanceOf(Forbidden);
    expect(await sql`select 1 from support_requests where created_by = ${claimerId}`).toHaveLength(
      before,
    );
  });
});

// A time-out also binds the address it was set from, so claiming by that address takes it even when its account holds none
// of the claimed requests.
describe('an account claiming by an address a standing time-out binds', () => {
  async function claimUnderAddressTimeout(lifted: boolean) {
    const { id: claimerId } = await signUp();
    await asTouch(sql, (tx) => tx`update users set email_verified = true where id = ${claimerId}`);
    const rows = await signedOutRequests();
    // The timed-out account wrote from this address, but its requests are gone; only the time-out's key names the address.
    const earlier = await insertAnonymousUser(sql);
    await insertSupportTimeout(sql, earlier, { address: AS_TYPED, lifted });
    // Preconditions: neither the claimer nor the account whose requests it claims is timed out.
    expect(
      await sql`select 1 from support_timeouts where user_id in (${claimerId}, ${rows.anonymousId})`,
    ).toHaveLength(0);

    const signedIn = await post(auth, '/sign-in/email', { email: CLAIMER, password: PASSWORD });
    expect(signedIn.status, await signedIn.clone().text()).toBe(200);
    expect(await requestRow(rows.fromAnonymous)).toMatchObject({ created_by: claimerId });
    return claimerId;
  }

  const sendAs = (claimerId: string) =>
    sendSupportRequest(
      { userId: claimerId, role: 'user' },
      { about: 'account', subject: 'After the claim', message: 'It still sticks.' },
      { origin: async () => 'http://localhost:3000' },
    );

  it('takes that time-out, and its own send is refused', async () => {
    const claimerId = await claimUnderAddressTimeout(false);
    const before = (await sql`select 1 from support_requests where created_by = ${claimerId}`)
      .length;

    expect(await failureOf(sendAs(claimerId))).toBeInstanceOf(Forbidden);
    expect(await sql`select 1 from support_requests where created_by = ${claimerId}`).toHaveLength(
      before,
    );
  });

  it('takes nothing from a lifted one, and its own send saves', async () => {
    const claimerId = await claimUnderAddressTimeout(true);

    expect((await sendAs(claimerId)).createdBy).toBe(claimerId);
  });
});
