import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import postgres from 'postgres';
import { setupServer } from 'msw/node';
import type { Message } from '@/lib/types';
import { SIGNED_OUT_SENDER_ID } from '@/lib/support-sender';
import { B, E } from '../support/as-user';
import { importAuth } from '../support/auth-module';
import { insertSupportReply, insertSupportRequest } from '../support/db/insert-support-request';
import { asTouch } from '../support/db/touch-row';
import { insertSupportTimeout } from '../support/db/insert-support-timeout';
import { Forbidden } from '@/lib/errors';
import { sendSupportRequest } from '@/modules/support';
import { failureOf } from '../support/db/database';
import { PROVIDER_CREDENTIALS, cookieHeader } from '../support/oauth';
import { post, pwnedRange } from '../support/password';
import type { AuthInstance } from '../support/types';
import { useTestDatabase } from '../support/db/database';

// Through Better Auth's real endpoints.
// (claude-docs/design-decisions/support.md, "Claim by verified email")
const send = vi.hoisted(() => vi.fn<(message: Message) => Promise<void>>());
vi.mock('@/lib/mail', () => ({ send }));
const startJob = vi.hoisted(() => vi.fn(async (..._args: unknown[]) => 'run-id'));
vi.mock('@/lib/jobs', () => ({ startJob }));
vi.stubEnv('MAIL_TRANSPORT', '');

const DOMAIN = '@support-claim.test';
const CLAIMER = `claimer${DOMAIN}`;
const AS_TYPED = `Claimer${DOMAIN.toUpperCase()}`;
const PASSWORD = 'Testwort climbs the northern wall';

let sql: ReturnType<typeof postgres>;

useTestDatabase((client) => {
  sql = client;
});

let auth: AuthInstance;

const server = setupServer(pwnedRange([], []));
beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

beforeAll(async () => {
  auth = await importAuth(PROVIDER_CREDENTIALS);
});

beforeEach(async () => {
  await sql`truncate support_replies, support_requests, support_timeouts, support_send_counts cascade`;
  await sql`truncate user_privilege_changes`;
  const mine = sql`select id from users where email like ${`%${DOMAIN}`}`;
  await sql`delete from sessions where user_id in (${mine})`;
  await sql`delete from accounts where user_id in (${mine})`;
  await sql`delete from workspace_members where user_id in (${mine})`;
  await sql`delete from users where email like ${`%${DOMAIN}`}`;
  send.mockReset();
});

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

function mailedLink(): string {
  const link = send.mock.calls
    .map(([message]) => message.text.match(/https?:\/\/\S+\/verify-email\?[^\s\]]+/)?.[0])
    .find(Boolean);
  if (!link) throw new Error('no verification link was mailed');
  return link;
}

async function signedOutRequests() {
  const fromTyped = await insertSupportRequest(sql, {
    createdBy: SIGNED_OUT_SENDER_ID,
    senderEmail: AS_TYPED,
    subject: 'Sent with the address in capitals',
  });
  const fromSignedOut = await insertSupportRequest(sql, {
    createdBy: SIGNED_OUT_SENDER_ID,
    senderEmail: CLAIMER,
    subject: 'Sent with the address as stored',
  });
  for (const requestId of [fromTyped, fromSignedOut]) {
    await insertSupportReply(sql, requestId, {
      role: 'staff',
      createdBy: E.id,
      body: 'Which jar?',
    });
    await insertSupportReply(sql, requestId, {
      role: 'sender',
      createdBy: SIGNED_OUT_SENDER_ID,
      body: 'Testwort.',
    });
  }
  await sql`update support_requests set view_token_hash = md5(id::text) where id in (${fromTyped}, ${fromSignedOut})`;
  const elsewhere = await insertSupportRequest(sql, {
    createdBy: SIGNED_OUT_SENDER_ID,
    senderEmail: `someone-else${DOMAIN}`,
  });
  const owned = await insertSupportRequest(sql, { createdBy: B.id });
  return { fromTyped, fromSignedOut, elsewhere, owned };
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
    // Preconditions: the claimer is verified, and nothing is its yet.
    expect(
      (await sql`select email_verified from users where id = ${claimerId}`)[0]?.email_verified,
    ).toBe(true);
    expect(await sql`select 1 from support_requests where created_by = ${claimerId}`).toHaveLength(
      0,
    );

    const signedIn = await post(auth, '/sign-in/email', { email: CLAIMER, password: PASSWORD });
    expect(signedIn.status, await signedIn.clone().text()).toBe(200);

    for (const id of [rows.fromTyped, rows.fromSignedOut]) {
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
      await sql`select view_token_hash from support_requests where id in (${rows.fromTyped}, ${rows.fromSignedOut})`,
    ).toEqual([{ view_token_hash: null }, { view_token_hash: null }]);
    expect(await requestRow(rows.elsewhere)).toMatchObject({
      created_by: SIGNED_OUT_SENDER_ID,
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
    expect(await requestRow(rows.fromTyped)).toMatchObject({
      created_by: SIGNED_OUT_SENDER_ID,
      sender_email: AS_TYPED,
    });

    const verified = await auth.handler(new Request(mailedLink(), { headers: { cookie } }));
    expect(verified.status).toBeLessThan(400);
    expect(
      (await sql`select email_verified from users where id = ${claimerId}`)[0]?.email_verified,
    ).toBe(true);

    for (const id of [rows.fromTyped, rows.fromSignedOut]) {
      expect(await requestRow(id)).toEqual({
        created_by: claimerId,
        updated_by: claimerId,
        sender_email: null,
      });
    }
    expect(await requestRow(rows.owned)).toMatchObject({ created_by: B.id });
  });

  it('leaves another visitor’s request alone when the claimer’s address is only part of its address', async () => {
    const { id: claimerId } = await signUp();
    await asTouch(sql, (tx) => tx`update users set email_verified = true where id = ${claimerId}`);
    const near = await insertSupportRequest(sql, {
      createdBy: SIGNED_OUT_SENDER_ID,
      senderEmail: `x${CLAIMER}`,
    });

    expect(
      (await post(auth, '/sign-in/email', { email: CLAIMER, password: PASSWORD })).status,
    ).toBe(200);

    expect(await requestRow(near)).toMatchObject({
      created_by: SIGNED_OUT_SENDER_ID,
      sender_email: `x${CLAIMER}`,
    });
  });
});

// A keeper's time-out on a signed-out request names the address, as its HMAC key, with no account. Claiming by that address
// hands the time-out to the claiming account, so the claim is no way out of it.
describe('an account claiming by an address a standing time-out binds', () => {
  async function claimUnderAddressTimeout(lifted: boolean) {
    const { id: claimerId } = await signUp();
    await asTouch(sql, (tx) => tx`update users set email_verified = true where id = ${claimerId}`);
    const rows = await signedOutRequests();
    // Spelt as the visitor typed it, so the match is on the normalised address's key.
    const timeout = await insertSupportTimeout(sql, null, { address: AS_TYPED, lifted });
    const othersTimeout = await insertSupportTimeout(sql, null, {
      address: `someone-else${DOMAIN}`,
    });
    // Precondition: the claimer stands under no time-out of its own, so a refusal below is the one it took over.
    expect(await sql`select 1 from support_timeouts where user_id = ${claimerId}`).toHaveLength(0);

    const signedIn = await post(auth, '/sign-in/email', { email: CLAIMER, password: PASSWORD });
    expect(signedIn.status, await signedIn.clone().text()).toBe(200);
    // The claim ran.
    expect(await requestRow(rows.fromTyped)).toMatchObject({ created_by: claimerId });
    return { claimerId, timeout, othersTimeout };
  }

  const sendAs = (claimerId: string) =>
    sendSupportRequest(
      { userId: claimerId, role: 'user' },
      { about: 'account', subject: 'After the claim', message: 'It still sticks.' },
      { origin: async () => 'http://localhost:3000' },
    );

  it('moves the time-out to the claiming account, and leaves another address’s alone', async () => {
    const { claimerId, timeout, othersTimeout } = await claimUnderAddressTimeout(false);

    expect(await sql`select user_id from support_timeouts where id = ${timeout}`).toEqual([
      { user_id: claimerId },
    ]);
    expect(await sql`select user_id from support_timeouts where id = ${othersTimeout}`).toEqual([
      { user_id: null },
    ]);
  });

  it('then refuses the claiming account’s own send', async () => {
    const { claimerId } = await claimUnderAddressTimeout(false);
    const before = (await sql`select 1 from support_requests where created_by = ${claimerId}`)
      .length;

    expect(await failureOf(sendAs(claimerId))).toBeInstanceOf(Forbidden);
    expect(await sql`select 1 from support_requests where created_by = ${claimerId}`).toHaveLength(
      before,
    );
  });

  it('lets the claiming account send when the time-out was lifted', async () => {
    const { claimerId } = await claimUnderAddressTimeout(true);

    expect((await sendAs(claimerId)).createdBy).toBe(claimerId);
  });
});
