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
