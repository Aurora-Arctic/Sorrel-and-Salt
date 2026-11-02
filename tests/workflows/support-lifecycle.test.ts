import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import postgres from 'postgres';
import { getRun, start } from 'workflow/api';
import { waitForSleep } from '@workflow/vitest';
import { BOOTSTRAP_USER_ID } from '@/db/bootstrap';
import { SIGNED_OUT_SENDER_ID } from '@/lib/support-sender';
import { SYSTEM_ACTOR_ID } from '@/lib/system-actor';
import { supportRequestLifecycle } from '@/modules/support/jobs/support-lifecycle';
import { supportRetentionSweep } from '@/modules/support/jobs/support-retention-sweep';

// The support request's own job and the sweep, run end to end by the SDK's local world. Mail goes over HTTP to a stand-in
// Mailpit in this process, which can be told to fail, and which records the request's status as each mail arrives. A run's
// sleep is woken by the test after the row is moved back in time, standing in for the days passing.

const DOMAIN = '@support-lifecycle-run.test';
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
async function resolvedRequest(by: string, daysAgo: number, about = 'bug'): Promise<string> {
  const [{ id }] = await sql`
    insert into support_requests
      (about, subject, message, path, status, resolved_by, resolved_at, created_at, created_by, updated_by)
    values (${about}, 'The Testwort jar sticks', 'It will not open.', '/compendium', 'resolved', ${BOOTSTRAP_USER_ID},
      now() - make_interval(days => ${daysAgo}), now() - make_interval(days => ${daysAgo + 1}), ${by}, ${by})
    returning id
  `;
  return id as string;
}

/** A request from `by`, closed `monthsAgo` months ago, with a reply from each side. */
async function closedRequest(by: string, monthsAgo: number, about = 'bug'): Promise<string> {
  const [{ id }] = await sql`
    insert into support_requests
      (about, subject, message, path, status, resolved_by, resolved_at, closed_at, created_at, created_by, updated_by)
    values (${about}, 'The Testwort jar sticks', 'It will not open.', '/coven/redacted', 'closed', ${by},
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

/** Moves the request's resolution back to `daysAgo` days ago, and `hoursAgo` hours more. */
async function resolvedDaysAgo(id: string, daysAgo: number, hoursAgo = 0): Promise<void> {
  await sql`
    update support_requests set resolved_at = now() - make_interval(days => ${daysAgo}, hours => ${hoursAgo})
    where id = ${id}
  `;
}

const rowOf = async (id: string) =>
  (await sql`select * from support_requests where id = ${id}`)[0]!;

/** Wakes the run's pending sleep. */
async function wake(run: Awaited<ReturnType<typeof start>>): Promise<void> {
  const sleepId = await waitForSleep(run);
  await getRun(run.runId).wakeUp({ correlationIds: [sleepId] });
}

describe('the closing-soon notice and the close', () => {
  it('sends the notice on day 5, marks it only once sent, then closes on day 7 and waits twelve months to anonymise', async () => {
    const { id: by, email } = await sender();
    const id = await resolvedRequest(by, 4);
    const run = await start(supportRequestLifecycle, [id, ORIGIN]);

    // Day 4: the run waits for day 5 and has mailed nothing.
    await waitForSleep(run);
    expect(received).toEqual([]);
    expect((await rowOf(id)).closing_notice_sent_at).toBeNull();

    await resolvedDaysAgo(id, 5);
    await wake(run);
    await waitForSleep(run);
    expect(received).toHaveLength(1);
    expect(received[0]).toMatchObject({ to: email, status: 'resolved' });
    expect(received[0]!.text).toContain(`${ORIGIN}/account/support?request=${id}`);
    expect((await rowOf(id)).closing_notice_sent_at).toBeInstanceOf(Date);
    expect((await rowOf(id)).status).toBe('resolved');

    await resolvedDaysAgo(id, 7);
    await wake(run);
    // Closed, and now waiting out the twelve months.
    await waitForSleep(run);
    const closed = await rowOf(id);
    expect(closed.status).toBe('closed');
    expect(closed.subject).toBe('The Testwort jar sticks');
    expect(received).toHaveLength(1);
  });

  it('reads the sender and the subject when it sends, and says how long is actually left', async () => {
    const { id: by, email } = await sender();
    const id = await resolvedRequest(by, 4);
    const run = await start(supportRequestLifecycle, [id, ORIGIN]);
    await waitForSleep(run);

    // Changed after the run started: the notice names what the row says when it is sent.
    const renamed = `renamed${DOMAIN}`;
    await sql`update users set email = ${renamed} where id = ${by}`;
    await sql`update support_requests set subject = 'The Testwort lid is stuck' where id = ${id}`;
    // A late wake: day 6 and 12 hours, so half a day is left, not two.
    await resolvedDaysAgo(id, 6, 12);
    await wake(run);
    await waitForSleep(run);

    expect(received).toHaveLength(1);
    expect(received[0]!.to).toBe(renamed);
    expect(received[0]!.to).not.toBe(email);
    expect(received[0]!.subject).toContain('The Testwort lid is stuck');
    expect(received[0]!.text).toContain('closes in 12 hours');
    expect(received[0]!.text).not.toContain('2 days');
  });

  it('says two days on the fifth day', async () => {
    const { id: by } = await sender();
    const id = await resolvedRequest(by, 5);
    const run = await start(supportRequestLifecycle, [id, ORIGIN]);
    await waitForSleep(run);

    expect(received).toHaveLength(1);
    expect(received[0]!.text).toContain('closes in 2 days');
  });

  it('closes a request resolved 8 days ago with no notice, since it has already lapsed', async () => {
    const { id: by } = await sender();
    const id = await resolvedRequest(by, 8);
    const resolvedAt = (await rowOf(id)).resolved_at as Date;

    const run = await start(supportRequestLifecycle, [id, ORIGIN]);
    await waitForSleep(run);

    expect(received).toEqual([]);
    const row = await rowOf(id);
    expect(row.status).toBe('closed');
    expect((row.closed_at as Date).getTime()).toBe(resolvedAt.getTime() + 7 * 24 * 60 * 60 * 1000);
    expect(row.closing_notice_sent_at).toBeNull();
  });

  it('leaves a request untouched whose sender wrote on day 3, and ends the run', async () => {
    const { id: by } = await sender();
    const id = await resolvedRequest(by, 3);
    const run = await start(supportRequestLifecycle, [id, ORIGIN]);
    await waitForSleep(run);

    // The sender's message reopens it, as sendSenderMessage writes.
    await sql`
      update support_requests set status = 'open', resolved_at = null, resolved_by = null, last_sender_activity_at = now()
      where id = ${id}
    `;
    await sql`
      insert into support_replies (request_id, body, author_role, created_by, updated_by)
      values (${id}, 'It is back.', 'sender', ${by}, ${by})
    `;
    await wake(run);

    expect(await run.returnValue).toBe('done');
    const row = await rowOf(id);
    expect(row.status).toBe('open');
    expect(row.closed_at).toBeNull();
    expect(row.closing_notice_sent_at).toBeNull();
    expect(received).toEqual([]);
  });

  it('sends the notice once: a second start while the first waits ends at once, and a later run sends no second notice', async () => {
    const { id: by } = await sender();
    const id = await resolvedRequest(by, 6);
    const first = await start(supportRequestLifecycle, [id, ORIGIN]);
    await waitForSleep(first);
    expect(received).toHaveLength(1);

    const second = await start(supportRequestLifecycle, [id, ORIGIN]);
    expect(await second.returnValue).toBe('duplicate');

    await resolvedDaysAgo(id, 7);
    await wake(first);
    await waitForSleep(first);
    expect((await rowOf(id)).status).toBe('closed');

    // The first run waits twelve months, so a start now is a duplicate too; the mail count stays at one.
    const third = await start(supportRequestLifecycle, [id, ORIGIN]);
    expect(await third.returnValue).toBe('duplicate');
    expect(received).toHaveLength(1);
    expect(attempts).toHaveLength(1);
  });

  it('retries a notice the transport refused twice, and marks it once', async () => {
    const { id: by } = await sender();
    const id = await resolvedRequest(by, 5);
    failNext = 2;
    const run = await start(supportRequestLifecycle, [id, ORIGIN]);
    await waitForSleep(run);

    expect(attempts).toHaveLength(3);
    expect(received).toHaveLength(1);
    expect((await rowOf(id)).closing_notice_sent_at).toBeInstanceOf(Date);
  });

  it('logs a notice that fails every attempt, leaves the marker unset, and still closes on day 7', async () => {
    const errors = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { id: by } = await sender();
    const id = await resolvedRequest(by, 6);
    failNext = Number.POSITIVE_INFINITY;
    const run = await start(supportRequestLifecycle, [id, ORIGIN]);

    // Every attempt fails, and the run gives the notice up and waits for day 7.
    await waitForSleep(run);
    expect(attempts.length).toBe(4);
    expect(received).toEqual([]);
    expect((await rowOf(id)).closing_notice_sent_at).toBeNull();
    expect(errors.mock.calls.some(([line]) => /mailpit answered 503/.test(String(line)))).toBe(
      true,
    );

    // The close still comes, and the given-up notice is not tried again.
    await resolvedDaysAgo(id, 7);
    await wake(run);
    await waitForSleep(run);
    expect((await rowOf(id)).status).toBe('closed');
    expect(attempts.length).toBe(4);
    errors.mockRestore();
  });
});

describe('anonymising', () => {
  const counts = () => sql`
    select about, date_trunc('month', created_at) as month, status, count(*)::int as n
    from support_requests group by 1, 2, 3 order by 1, 2, 3
  `;

  it('anonymises a request closed 13 months ago and leaves one closed 11 months ago, keeping the counts', async () => {
    const { id: by } = await sender();
    const old = await closedRequest(by, 13, 'bug');
    const recent = await closedRequest(by, 11, 'account');
    const before = await rowOf(old);
    const countsBefore = await counts();

    const run = await start(supportRetentionSweep, []);
    expect(await run.returnValue).toEqual({ closed: 0, anonymised: 1 });

    const after = await rowOf(old);
    // Gone: what the sender wrote, the page, and who they are. The subject becomes a fixed one, so the row still opens.
    expect(after).toMatchObject({
      subject: 'Anonymised support request.',
      message: '',
      path: '',
      sender_email: null,
      created_by: SYSTEM_ACTOR_ID,
    });
    // The sender resolved it themselves, so that stamp named them too.
    expect(after.resolved_by).toBeNull();
    const replies =
      await sql`select body, author_role, created_by from support_replies where request_id = ${old}`;
    expect(replies.map((reply) => reply.body)).toEqual(['', '']);
    expect(replies.find((reply) => reply.author_role === 'sender')!.created_by).toBe(
      SYSTEM_ACTOR_ID,
    );
    expect(replies.find((reply) => reply.author_role === 'staff')!.created_by).toBe(
      BOOTSTRAP_USER_ID,
    );
    // Kept: the topic, the status and the dates.
    for (const column of ['about', 'status', 'created_at', 'resolved_at', 'closed_at'] as const) {
      expect(after[column]).toEqual(before[column]);
    }
    expect(await counts()).toEqual(countsBefore);

    const untouched = await rowOf(recent);
    expect(untouched).toMatchObject({
      subject: 'The Testwort jar sticks',
      created_by: by,
      path: '/coven/redacted',
    });
  });

  it('is idempotent: a second sweep changes nothing', async () => {
    const { id: by } = await sender();
    const old = await closedRequest(by, 13);
    await (
      await start(supportRetentionSweep, [])
    ).returnValue;
    const once = await rowOf(old);

    const again = await start(supportRetentionSweep, []);
    expect(await again.returnValue).toEqual({ closed: 0, anonymised: 0 });
    expect(await rowOf(old)).toEqual(once);
  });

  it('anonymises a signed-out sender’s request, dropping the address', async () => {
    const [{ id }] = await sql`
      insert into support_requests (about, subject, message, path, status, closed_at, sender_email, created_by, updated_by)
      values ('question', 'Testwort?', 'Where is it?', '/support', 'closed', now() - interval '13 months',
        ${`signed-out${DOMAIN}`}, ${SIGNED_OUT_SENDER_ID}, ${SIGNED_OUT_SENDER_ID})
      returning id
    `;
    await (
      await start(supportRetentionSweep, [])
    ).returnValue;
    expect(await rowOf(id as string)).toMatchObject({
      sender_email: null,
      created_by: SYSTEM_ACTOR_ID,
      message: '',
    });
  });

  it('closes, as of its seventh day, a resolved request whose own run was lost', async () => {
    const { id: by } = await sender();
    const id = await resolvedRequest(by, 9);
    const resolvedAt = (await rowOf(id)).resolved_at as Date;
    const run = await start(supportRetentionSweep, []);
    expect(await run.returnValue).toEqual({ closed: 1, anonymised: 0 });
    const row = await rowOf(id);
    expect(row.status).toBe('closed');
    expect((row.closed_at as Date).getTime()).toBe(resolvedAt.getTime() + 7 * 24 * 60 * 60 * 1000);
    // The sweep sends no notice.
    expect(received).toEqual([]);
  });

  it('a request’s own run anonymises it twelve months after the close', async () => {
    const { id: by } = await sender();
    const id = await closedRequest(by, 11);
    const run = await start(supportRequestLifecycle, [id, null]);
    await waitForSleep(run);
    expect((await rowOf(id)).subject).toBe('The Testwort jar sticks');

    await sql`update support_requests set closed_at = now() - interval '13 months' where id = ${id}`;
    await wake(run);
    expect(await run.returnValue).toBe('done');
    expect((await rowOf(id)).subject).toBe('Anonymised support request.');
  });
});
