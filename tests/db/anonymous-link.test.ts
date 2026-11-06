import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import postgres from 'postgres';
import { setupServer } from 'msw/node';
import type { Message } from '@/lib/types';
import { SIGNED_OUT_SENDER_ID } from '@/lib/support-sender';
import { ORIGIN, PROVIDER_CREDENTIALS, cookieHeader } from '../support/oauth';
import { importAuth } from '../support/auth-module';
import { E } from '../support/as-user';
import { asTouch } from '../support/db/touch-row';
import { post, pwnedRange } from '../support/password';
import type { AuthInstance } from '../support/types';

// Through Better Auth's real endpoints and the real GraphQL route: a signed-out support send mints an anonymous account and
// sets its cookie on the response, and a sign-in from that browser links it, so the requests follow the visitor to their
// real account and the anonymous one is gone (claude-docs/design-decisions/m15.48-anonymous-sender.md). Pages are
// tests/lib/request-session.test.ts's.

const send = vi.hoisted(() => vi.fn<(message: Message) => Promise<void>>());
vi.mock('@/lib/mail', () => ({ send }));
const startJob = vi.hoisted(() => vi.fn(async (..._args: unknown[]) => 'run-id'));
vi.mock('@/lib/jobs', () => ({ startJob }));
// The receipt is tried once through the mocked `send` while MAIL_TRANSPORT is unset.
vi.stubEnv('MAIL_TRANSPORT', '');

const DOMAIN = '@anonymous-link.test';
const PASSWORD_USER = `password${DOMAIN}`;
// A different address from the account's, so the requests follow by the link and not by an address claim.
const FORM_ADDRESS = `visitor${DOMAIN}`;
const PASSWORD = 'Testwort crowns the eastern hedge';

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
  startJob.mockClear();
});

const SEND_SIGNED_OUT =
  'mutation Send($input: SignedOutSupportRequestInput!) { sendSignedOutSupportRequest(input: $input) }';
const INPUT = {
  about: 'account',
  email: FORM_ADDRESS,
  subject: 'The Testwort code never arrives',
  message: 'I ask for a sign-in code and nothing comes.',
};

/** One GraphQL operation through the real route, as the browser sends it, with `cookie` when given. */
async function graphql(query: string, variables: Record<string, unknown> = {}, cookie?: string) {
  const { POST } = await import('@/app/api/graphql/route');
  return POST(
    new Request(`${ORIGIN}/api/graphql`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-sorrel-client': 'web',
        ...(cookie && { cookie }),
      },
      body: JSON.stringify({ query, variables }),
    }),
  );
}

/** The user a cookie signs in, read back through get-session. */
async function sessionUser(cookie: string) {
  const response = await auth.handler(
    new Request(`${ORIGIN}/api/auth/get-session`, { headers: { cookie } }),
  );
  return ((await response.json()) as { user?: { id: string; isAnonymous?: boolean } } | null)?.user;
}

/** A signed-out send through the route; returns the response's cookie and the anonymous account it signs in. */
async function sendSignedOut() {
  const response = await graphql(SEND_SIGNED_OUT, { input: INPUT });
  const body = (await response.json()) as { data?: unknown; errors?: unknown };
  expect(body.errors).toBeUndefined();
  const cookie = cookieHeader(response);
  const user = await sessionUser(cookie);
  return { response, cookie, anonymousId: user?.id, isAnonymous: user?.isAnonymous };
}

/** Every row of every table whose foreign key names users(id) and holds `userId`, as `table.column`. */
async function referencesTo(userId: string): Promise<string[]> {
  const columns = await sql<{ tbl: string; col: string }[]>`
    select c.conrelid::regclass::text as tbl, a.attname as col
    from pg_constraint c
    join pg_attribute a on a.attrelid = c.conrelid and a.attnum = any (c.conkey)
    where c.contype = 'f' and c.confrelid = 'users'::regclass`;
  // Precondition: the scan reaches the tables a sender's rows sit in.
  expect(columns.map(({ tbl, col }) => `${tbl}.${col}`)).toEqual(
    expect.arrayContaining(['support_requests.created_by', 'support_replies.created_by']),
  );
  const found: string[] = [];
  for (const { tbl, col } of columns) {
    const [{ n }] = await sql.unsafe(`select count(*)::int as n from ${tbl} where "${col}" = $1`, [
      userId,
    ]);
    if (n > 0) found.push(`${tbl}.${col}`);
  }
  return found;
}

describe('a signed-out send', () => {
  it('sets the session cookie of a new anonymous account on the GraphQL response', async () => {
    const { response, cookie, anonymousId, isAnonymous } = await sendSignedOut();

    expect(response.headers.getSetCookie().some((header) => /session_token=/.test(header))).toBe(
      true,
    );
    expect(cookie).toMatch(/session_token=/);
    expect(anonymousId).toEqual(expect.any(String));
    expect(isAnonymous).toBe(true);
    const [account] = await sql`
      select is_anonymous, can_create_workspace from users where id = ${anonymousId!}`;
    expect(account).toEqual({ is_anonymous: true, can_create_workspace: false });
  });

  it('writes the request as that account, with the form’s address, and seats and schedules nothing for it', async () => {
    const { anonymousId } = await sendSignedOut();

    const rows = await sql`select created_by, updated_by, sender_email from support_requests`;
    expect(rows).toEqual([
      { created_by: anonymousId, updated_by: anonymousId, sender_email: FORM_ADDRESS },
    ]);
    expect(rows[0]!.created_by).not.toBe(SIGNED_OUT_SENDER_ID);
    expect(await sql`select 1 from workspace_members where user_id = ${anonymousId!}`).toHaveLength(
      0,
    );
    // No expiry run names the account: the daily cleanup collects it on its own rule.
    expect(JSON.stringify(startJob.mock.calls)).not.toContain(anonymousId!);
  });

  it('answers the anonymous cookie on the support list, and as signed out elsewhere', async () => {
    const { cookie } = await sendSignedOut();

    const mine = (await (
      await graphql('query { mySupportRequests(first: 5) { totalCount } }', {}, cookie)
    ).json()) as { data?: { mySupportRequests?: { totalCount: number } } };
    expect(mine.data?.mySupportRequests?.totalCount).toBe(1);

    const me = (await (await graphql('query { me { id } }', {}, cookie)).json()) as {
      data?: { me: unknown } | null;
      errors?: unknown[];
    };
    expect(me.data?.me ?? null).toBeNull();
  });
});

describe('a second send from the anonymous cookie', () => {
  it('reuses the same account: no second users row, and the same sender on both requests', async () => {
    const { cookie, anonymousId } = await sendSignedOut();
    // Precondition: the first send left one anonymous account.
    expect(await sql`select id from users where is_anonymous`).toEqual([{ id: anonymousId }]);

    const again = await graphql(
      SEND_SIGNED_OUT,
      { input: { ...INPUT, subject: 'A second Testwort request' } },
      cookie,
    );
    expect(((await again.json()) as { errors?: unknown }).errors).toBeUndefined();

    expect(await sql`select id from users where is_anonymous`).toEqual([{ id: anonymousId }]);
    expect(await sql`select created_by from support_requests`).toEqual([
      { created_by: anonymousId },
      { created_by: anonymousId },
    ]);
  });
});

describe('signing in from an anonymous session', () => {
  /** A verified password account, never signed in, so the sign-in below is its first session. */
  async function passwordAccount(): Promise<string> {
    const response = await post(auth, '/sign-up/email', {
      name: 'Fixture Person',
      email: PASSWORD_USER,
      password: PASSWORD,
    });
    expect(response.status, await response.clone().text()).toBe(200);
    await asTouch(
      sql,
      (tx) => tx`update users set email_verified = true where email = ${PASSWORD_USER}`,
    );
    await sql`delete from sessions where user_id = (select id from users where email = ${PASSWORD_USER})`;
    const [{ id }] = await sql<
      { id: string }[]
    >`select id from users where email = ${PASSWORD_USER}`;
    return id;
  }

  it('links: the requests and the sender’s replies follow, and the anonymous account and its sessions are gone', async () => {
    const { cookie, anonymousId } = await sendSignedOut();
    const [request] = await sql`select id from support_requests where created_by = ${anonymousId!}`;
    // A staff reply and one of the sender's own, so both kinds of reply are on the request.
    await sql`
      insert into support_replies (request_id, body, author_role, created_by, updated_by)
      values (${request!.id}, 'Which address?', 'staff', ${E.id}, ${E.id}),
        (${request!.id}, 'The Testwort one.', 'sender', ${anonymousId!}, ${anonymousId!})`;
    const realId = await passwordAccount();
    // Preconditions: the anonymous account holds the request and a reply, and is not the real one.
    expect(anonymousId).not.toBe(realId);
    expect(await referencesTo(anonymousId!)).toEqual(
      expect.arrayContaining(['support_requests.created_by', 'support_replies.created_by']),
    );

    const signedIn = await post(
      auth,
      '/sign-in/email',
      { email: PASSWORD_USER, password: PASSWORD },
      cookie,
    );
    expect(signedIn.status, await signedIn.clone().text()).toBe(200);

    expect(await sql`select created_by, updated_by, sender_email from support_requests`).toEqual([
      { created_by: realId, updated_by: realId, sender_email: null },
    ]);
    expect(
      await sql`select author_role, created_by from support_replies order by author_role`,
    ).toEqual([
      { author_role: 'sender', created_by: realId },
      { author_role: 'staff', created_by: E.id },
    ]);
    expect(await sql`select 1 from users where id = ${anonymousId!}`).toHaveLength(0);
    expect(await sql`select 1 from sessions where user_id = ${anonymousId!}`).toHaveLength(0);
    expect(await referencesTo(anonymousId!)).toEqual([]);
    // The new cookie signs in the real account, which now lists the request as its own.
    const realCookie = cookieHeader(signedIn);
    expect((await sessionUser(realCookie))?.id).toBe(realId);
    const mine = (await (
      await graphql('query { mySupportRequests(first: 5) { totalCount } }', {}, realCookie)
    ).json()) as { data?: { mySupportRequests?: { totalCount: number } } };
    expect(mine.data?.mySupportRequests?.totalCount).toBe(1);
  });
});
