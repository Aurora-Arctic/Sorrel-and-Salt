import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import postgres from 'postgres';
import { start } from 'workflow/api';
import { BOOTSTRAP_USER_ID } from '@/db/bootstrap';
import { SIGNED_OUT_SENDER_ID } from '@/lib/support-sender';
import { SYSTEM_ACTOR_ID } from '@/lib/system-actor';
import { supportRetention } from '@/modules/support/jobs/support-retention';
import { supportRetentionBatch } from '@/modules/support/jobs/support-retention-batch';

// The daily support-retention job, run end to end by the SDK's local world: the coordinator that reads the ids due and starts a
// batch run per page, and the batch runs that do the work. Mail goes over HTTP to a stand-in Mailpit in this process, which can be
// told to fail, and which records the request's status as each mail arrives. No run sleeps, so none is woken.

const DOMAIN = '@support-retention-run.test';
const ORIGIN = 'http://localhost:3000';

let sql: ReturnType<typeof postgres>;
let failNext = 0;
const attempts: string[] = [];
const received: { to: string; subject: string; text: string; status: string | undefined }[] = [];

// The stand-in Mailpit answers fetch itself rather than listening on a port: the SDK's local world finds its own queue by the
// port this process listens on, so a second listener would take its deliveries.
const MAILPIT_URL = 'http://mailpit.test';
const realFetch = globalThis.fetch;
async function mailpit(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const url = input instanceof Request ? input.url : String(input);
  if (!url.startsWith(MAILPIT_URL)) return realFetch(input, init);
  const mail = JSON.parse(String(init?.body)) as {
    To: { Email: string }[];
    Subject: string;
    Text: string;
  };
  attempts.push(mail.Subject);
  if (failNext > 0) {
    failNext -= 1;
    return new Response('down', { status: 503 });
  }
  const id = /[?&]request=([0-9a-f-]{36})/.exec(mail.Text)?.[1];
  const [row] = id ? await sql`select status from support_requests where id = ${id}` : [];
  received.push({
    to: mail.To[0]!.Email,
    subject: mail.Subject,
    text: mail.Text,
    status: row?.status as string | undefined,
  });
  return Response.json({ ID: 'stand-in' });
}

beforeAll(() => {
  sql = postgres(process.env.DATABASE_URL as string, { onnotice: () => {} });
  vi.stubGlobal('fetch', mailpit);
  vi.stubEnv('MAIL_TRANSPORT', 'mailpit');
  vi.stubEnv('MAILPIT_URL', MAILPIT_URL);
  vi.stubEnv('VERCEL_ENV', '');
});

afterAll(async () => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  await sql.end();
});

beforeEach(async () => {
  failNext = 0;
  attempts.length = 0;
  received.length = 0;
  await sql`truncate support_replies, support_requests cascade`;
});

let made = 0;
/** A verified account to send requests from. */
async function sender(): Promise<{ id: string; email: string }> {
  made += 1;
  const email = `sender${made}${DOMAIN}`;
  const [{ id }] = await sql`
    insert into users (name, email, email_verified, created_by, updated_by)
    values (${`Testwort Sender ${made}`}, ${email}, true, ${BOOTSTRAP_USER_ID}, ${BOOTSTRAP_USER_ID})
    returning id
  `;
  return { id: id as string, email };
}

/** A request from `by`, resolved by staff `daysAgo` days ago. */
async function resolvedRequest(by: string, daysAgo: number): Promise<string> {
  const [{ id }] = await sql`
    insert into support_requests
      (about, subject, message, path, status, resolved_by, resolved_at, created_at, created_by, updated_by)
    values ('bug', 'The Testwort jar sticks', 'It will not open.', '/compendium', 'resolved', ${BOOTSTRAP_USER_ID},
      now() - make_interval(days => ${daysAgo}), now() - make_interval(days => ${daysAgo + 1}), ${by}, ${by})
    returning id
  `;
  return id as string;
}

/** A request from `by`, closed `monthsAgo` months ago, with a reply from each side. */
async function closedRequest(by: string, monthsAgo: number): Promise<string> {
  const [{ id }] = await sql`
    insert into support_requests
      (about, subject, message, path, status, resolved_by, resolved_at, closed_at, created_at, created_by, updated_by)
    values ('bug', 'The Testwort jar sticks', 'It will not open.', '/coven/redacted', 'closed', ${by},
      now() - make_interval(months => ${monthsAgo}, days => 7), now() - make_interval(months => ${monthsAgo}),
      now() - make_interval(months => ${monthsAgo}, days => 8), ${by}, ${by})
    returning id
  `;
  await sql`
    insert into support_replies (request_id, body, author_role, visibility, created_by, updated_by)
    values (${id}, 'Which jar?', 'staff', 'public', ${BOOTSTRAP_USER_ID}, ${BOOTSTRAP_USER_ID}),
      (${id}, 'The blue one.', 'sender', 'public', ${by}, ${by})
  `;
  return id as string;
}

const rowOf = async (id: string) =>
  (await sql`select * from support_requests where id = ${id}`)[0]!;

/** Runs one day's coordinator as of now; how many batch runs it started. */
async function runDay(): Promise<number> {
  const run = await start(supportRetention, [Date.now(), ORIGIN]);
  return run.returnValue;
}

describe('the coordinator', () => {
  it('starts one batch per stage with work, and the batches notice, close and anonymise what is due', async () => {
    const { id: by, email } = await sender();
    const noticeDue = await resolvedRequest(by, 6);
    const tooEarly = await resolvedRequest(by, 3);
    const lapsed = await resolvedRequest(by, 8);
    const old = await closedRequest(by, 13);
    const recent = await closedRequest(by, 11);

    expect(await runDay()).toBe(3);

    // The batches run apart from the coordinator, which has ended, so the test waits for what they leave.
    await vi.waitFor(async () => {
      expect((await rowOf(noticeDue)).closing_notice_sent_at).toBeInstanceOf(Date);
      expect((await rowOf(lapsed)).status).toBe('closed');
      expect((await rowOf(old)).created_by).toBe(SYSTEM_ACTOR_ID);
    });
    expect(received).toHaveLength(1);
    expect(received[0]).toMatchObject({ to: email, status: 'resolved' });
    expect(received[0]!.text).toContain(`/account/support?request=${noticeDue}`);
    expect(await rowOf(tooEarly)).toMatchObject({
      status: 'resolved',
      closing_notice_sent_at: null,
    });
    expect(await rowOf(recent)).toMatchObject({ created_by: by });
    const replies = await sql`select body from support_replies where request_id = ${old}`;
    expect(replies.map((reply) => reply.body)).toEqual(['', '']);
  });

  it('starts no batch when nothing is due, and so ends at once', async () => {
    const { id: by } = await sender();
    await resolvedRequest(by, 3);
    await closedRequest(by, 11);

    expect(await runDay()).toBe(0);
    expect(attempts).toEqual([]);
  });

  it('does nothing on a second run the same day', async () => {
    const { id: by } = await sender();
    const noticeDue = await resolvedRequest(by, 6);
    const lapsed = await resolvedRequest(by, 8);
    // The precondition: the first run had work, and its batches have done it.
    expect(await runDay()).toBe(2);
    await vi.waitFor(async () => {
      expect((await rowOf(noticeDue)).closing_notice_sent_at).toBeInstanceOf(Date);
      expect((await rowOf(lapsed)).status).toBe('closed');
    });

    expect(await runDay()).toBe(0);
    expect(received).toHaveLength(1);
  });
});

describe('a batch', () => {
  it('retries a notice the transport refused twice, and sends and stamps it once', async () => {
    const { id: by } = await sender();
    // Six days, not the five the notice opens at: on the day itself a few milliseconds between the database clock and this process decide whether it is due.
    const id = await resolvedRequest(by, 6);
    failNext = 2;
    const run = await start(supportRetentionBatch, [
      { kind: 'notice', ids: [id], now: Date.now(), origin: ORIGIN },
    ]);

    expect(await run.returnValue).toBe(1);
    expect(attempts).toHaveLength(3);
    expect(received).toHaveLength(1);
    expect((await rowOf(id)).closing_notice_sent_at).toBeInstanceOf(Date);
  });

  it('logs a batch that fails every attempt and leaves its notice unstamped for the next day', async () => {
    const errors = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { id: by } = await sender();
    const id = await resolvedRequest(by, 6);
    failNext = Number.POSITIVE_INFINITY;
    const run = await start(supportRetentionBatch, [
      { kind: 'notice', ids: [id], now: Date.now(), origin: ORIGIN },
    ]);

    expect(await run.returnValue).toBeNull();
    expect(received).toEqual([]);
    expect((await rowOf(id)).closing_notice_sent_at).toBeNull();
    expect(errors.mock.calls.some(([line]) => /every attempt failed/.test(String(line)))).toBe(
      true,
    );
    errors.mockRestore();
  });

  it('two batches over the same ids at once change each request once', async () => {
    const { id: by } = await sender();
    const lapsed = await resolvedRequest(by, 8);
    const old = await closedRequest(by, 13);
    const now = Date.now();
    const batches = await Promise.all([
      start(supportRetentionBatch, [{ kind: 'close', ids: [lapsed], now, origin: ORIGIN }]),
      start(supportRetentionBatch, [{ kind: 'close', ids: [lapsed], now, origin: ORIGIN }]),
      start(supportRetentionBatch, [{ kind: 'anonymise', ids: [old], now, origin: ORIGIN }]),
      start(supportRetentionBatch, [{ kind: 'anonymise', ids: [old], now, origin: ORIGIN }]),
    ]);
    const changed = await Promise.all(batches.map((run) => run.returnValue));

    expect(changed[0]! + changed[1]!).toBe(1);
    expect(changed[2]! + changed[3]!).toBe(1);
    expect((await rowOf(lapsed)).status).toBe('closed');
    expect((await rowOf(old)).created_by).toBe(SYSTEM_ACTOR_ID);
  });

  it('anonymises a signed-out sender’s request, dropping the address', async () => {
    const [{ id }] = await sql`
      insert into support_requests (about, subject, message, path, status, closed_at, sender_email, created_by, updated_by)
      values ('question', 'Testwort?', 'Where is it?', '/support', 'closed', now() - interval '13 months',
        ${`signed-out${DOMAIN}`}, ${SIGNED_OUT_SENDER_ID}, ${SIGNED_OUT_SENDER_ID})
      returning id
    `;
    const run = await start(supportRetentionBatch, [
      { kind: 'anonymise', ids: [id as string], now: Date.now(), origin: ORIGIN },
    ]);

    expect(await run.returnValue).toBe(1);
    expect(await rowOf(id as string)).toMatchObject({
      sender_email: null,
      created_by: SYSTEM_ACTOR_ID,
      message: '',
    });
  });
});
