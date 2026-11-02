import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import postgres from 'postgres';
import { getRun, start } from 'workflow/api';
import { waitForSleep } from '@workflow/vitest';
import { BOOTSTRAP_USER_ID } from '@/db/bootstrap';
import { documentMailing } from '@/modules/documents/jobs/document-mailing';
import { MAILING_BATCH_SIZE, MAILING_DAILY_CAP } from '@/modules/documents/mailing-pace';
import { insertDocumentVersion } from '../support/db/insert-document';

// The run that emails every account about a published document, end to end in the SDK's local world. The run carries the
// mailing's id and the origin alone, and mails the mailing's recipient rows, so each test writes exactly the rows it mails. Mail
// goes to a stand-in Mailpit, or a stand-in Resend where a quota answer is needed, both answering fetch in this process.

const DOMAIN = '@document-mailing-run.test';
const ORIGIN = 'http://localhost:3000';
const MAILPIT_URL = 'http://mailpit.test';
const RESEND_URL = 'https://api.resend.com/emails';
const SUMMARY = 'We now keep sign-in records for ninety days.';

let sql: ReturnType<typeof postgres>;
/** How many sends the stand-in refuses with a 503 before it takes the next one. */
let failNext = 0;
/** When set, the stand-in Resend answers 429 with this name once `quotaAfter` sends have been taken. */
let quota: { name: string; after: number } | null = null;
const attempts: string[] = [];
const received: { to: string; subject: string; text: string }[] = [];

// The stand-ins answer fetch itself rather than listening on a port: the local world finds its own queue by the port this process
// listens on, so a second listener would take its deliveries.
const realFetch = globalThis.fetch;
async function transport(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const url = input instanceof Request ? input.url : String(input);
  if (url.startsWith(MAILPIT_URL)) {
    const mail = JSON.parse(String(init?.body)) as {
      To: { Email: string }[];
      Subject: string;
      Text: string;
    };
    attempts.push(mail.To[0]!.Email);
    if (failNext > 0) {
      failNext -= 1;
      return new Response('down', { status: 503 });
    }
    received.push({ to: mail.To[0]!.Email, subject: mail.Subject, text: mail.Text });
    return Response.json({ ID: 'stand-in' });
  }
  if (url === RESEND_URL) {
    const mail = JSON.parse(String(init?.body)) as { to: string[]; subject: string; text: string };
    attempts.push(mail.to[0]!);
    if (quota && received.length >= quota.after) {
      return Response.json(
        { statusCode: 429, name: quota.name, message: 'You have reached your quota.' },
        { status: 429 },
      );
    }
    received.push({ to: mail.to[0]!, subject: mail.subject, text: mail.text });
    return Response.json({ id: 'stand-in' });
  }
  return realFetch(input, init);
}

function useMailpit() {
  vi.stubEnv('MAIL_TRANSPORT', 'mailpit');
  vi.stubEnv('MAILPIT_URL', MAILPIT_URL);
}

function useResend() {
  vi.stubEnv('MAIL_TRANSPORT', 'resend');
  vi.stubEnv('RESEND_API_KEY', 're_test_key');
  vi.stubEnv('MAIL_FROM', 'Sorrel & Salt <noreply@sorrelandsalt.com>');
}

beforeAll(async () => {
  sql = postgres(process.env.DATABASE_URL as string, { onnotice: () => {} });
  vi.stubGlobal('fetch', transport);
  vi.stubEnv('VERCEL_ENV', '');
  await sql`delete from users where email like ${`%${DOMAIN}`}`;
});

afterAll(async () => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  await sql.end();
});

beforeEach(async () => {
  failNext = 0;
  quota = null;
  attempts.length = 0;
  received.length = 0;
  useMailpit();
  // The daily cap counts every mailing's sends today, so no mailing outlives its test.
  await sql`truncate document_mailing_recipients, document_mailings cascade`;
});

let made = 0;
/** `count` verified accounts to mail. */
async function accounts(count: number): Promise<{ id: string; email: string }[]> {
  const rows = Array.from({ length: count }, () => {
    made += 1;
    return {
      name: `Testwort Reader ${made}`,
      email: `reader${made}${DOMAIN}`,
      email_verified: true,
      created_by: BOOTSTRAP_USER_ID,
      updated_by: BOOTSTRAP_USER_ID,
    };
  });
  return (await sql`insert into users ${sql(rows)} returning id, email`) as unknown as {
    id: string;
    email: string;
  }[];
}

let versionNumber = 100;
/** A new published version of the seeded document `key`: its id, and the document's title. */
async function publishedVersion(key: string): Promise<{ versionId: string; title: string }> {
  const [document] =
    await sql`select id, title from documents where key = ${key} and deleted_at is null`;
  if (!document) throw new Error(`the seeded database holds no ${key} document`);
  versionNumber += 1;
  const versionId = await insertDocumentVersion(
    sql,
    document.id as string,
    { number: versionNumber },
    BOOTSTRAP_USER_ID,
  );
  return { versionId, title: document.title as string };
}

interface MailingSeed {
  status?: 'sending' | 'sent' | 'replaced' | 'paused';
  /** Seconds before now the mailing was started, which orders the queue. */
  startedSecondsAgo?: number;
  /** Writes every recipient as sent now. */
  allSent?: boolean;
}

/** A mailing of `versionId` to `recipients`, written raw as the service would leave it. */
async function mailing(
  versionId: string,
  recipients: { id: string }[],
  { status = 'sending', startedSecondsAgo = 0, allSent = false }: MailingSeed = {},
): Promise<string> {
  const [{ id }] = await sql`
    insert into document_mailings
      (document_version_id, summary, status, recipient_count, finished_at, created_at, created_by, updated_by)
    values (${versionId}, ${SUMMARY}, ${status}, ${recipients.length}, ${status === 'sent' ? sql`now()` : null},
      now() - make_interval(secs => ${startedSecondsAgo}), ${BOOTSTRAP_USER_ID}, ${BOOTSTRAP_USER_ID})
    returning id`;
  await sql`
    insert into document_mailing_recipients ${sql(
      recipients.map((recipient) => ({
        mailing_id: id as string,
        user_id: recipient.id,
        sent_at: allSent ? new Date() : null,
        created_by: BOOTSTRAP_USER_ID,
        updated_by: BOOTSTRAP_USER_ID,
      })),
    )}`;
  return id as string;
}

const mailingRow = async (id: string) =>
  (await sql`select status, finished_at from document_mailings where id = ${id}`)[0]!;

const sentCount = async (id: string) =>
  Number(
    (
      await sql`select count(*) as sent from document_mailing_recipients
        where mailing_id = ${id} and sent_at is not null`
    )[0]!.sent,
  );

describe('the document mailing run', () => {
  it('mails a batch, sleeps, mails the rest, and finishes the mailing as sent', async () => {
    const { versionId } = await publishedVersion('privacy');
    const readers = await accounts(MAILING_BATCH_SIZE + 5);
    const mailingId = await mailing(versionId, readers);

    const run = await start(documentMailing, [mailingId, ORIGIN]);

    // Asleep between batches: one batch is out, recorded, and the mailing is still sending.
    const sleepId = await waitForSleep(run);
    expect(received).toHaveLength(MAILING_BATCH_SIZE);
    expect(await sentCount(mailingId)).toBe(MAILING_BATCH_SIZE);
    expect((await mailingRow(mailingId)).status).toBe('sending');

    await getRun(run.runId).wakeUp({ correlationIds: [sleepId] });

    await expect(run.returnValue).resolves.toBe('sent');
    // Every recipient once, and no one else.
    expect(received.map((mail) => mail.to).sort()).toEqual(
      readers.map((reader) => reader.email).sort(),
    );
    expect(await sentCount(mailingId)).toBe(readers.length);
    expect(await mailingRow(mailingId)).toMatchObject({
      status: 'sent',
      finished_at: expect.any(Date),
    });
  });

  it('stops before its next batch once a newer mailing of the same document has replaced it', async () => {
    const { versionId } = await publishedVersion('privacy');
    const readers = await accounts(MAILING_BATCH_SIZE + 5);
    const mailingId = await mailing(versionId, readers);

    const run = await start(documentMailing, [mailingId, ORIGIN]);
    const sleepId = await waitForSleep(run);
    // Precondition: recipients are left, so a run that ignored the status would mail them.
    expect(await sentCount(mailingId)).toBe(MAILING_BATCH_SIZE);
    // What the service leaves when an admin mails the document again.
    await sql`update document_mailings set status = 'replaced' where id = ${mailingId}`;
    await getRun(run.runId).wakeUp({ correlationIds: [sleepId] });

    await expect(run.returnValue).resolves.toBe('replaced');
    expect(received).toHaveLength(MAILING_BATCH_SIZE);
    expect(await mailingRow(mailingId)).toMatchObject({ status: 'replaced', finished_at: null });
  });

  it('waits behind an older mailing of another document, and is started when that one finishes', async () => {
    const privacy = await publishedVersion('privacy');
    const disclaimer = await publishedVersion('disclaimer');
    const first = await mailing(privacy.versionId, await accounts(3), { startedSecondsAgo: 3600 });
    const secondReaders = await accounts(2);
    const second = await mailing(disclaimer.versionId, secondReaders);

    const waiting = await start(documentMailing, [second, ORIGIN]);

    await expect(waiting.returnValue).resolves.toBe('queued');
    expect(received).toEqual([]);
    expect((await mailingRow(second)).status).toBe('sending');

    const active = await start(documentMailing, [first, ORIGIN]);

    await expect(active.returnValue).resolves.toBe('sent');
    // No one starts the second run here: the first run's end does.
    await vi.waitFor(
      async () => {
        expect((await mailingRow(second)).status).toBe('sent');
      },
      { timeout: 30_000, interval: 250 },
    );
    expect(await sentCount(second)).toBe(secondReaders.length);
  });

  it('ends at the daily cap without sleeping, and a run the next day mails the rest', async () => {
    const earlier = await publishedVersion('disclaimer');
    const alreadySent = MAILING_DAILY_CAP - 10;
    await mailing(earlier.versionId, await accounts(alreadySent), {
      status: 'sent',
      allSent: true,
    });
    const { versionId } = await publishedVersion('privacy');
    const readers = await accounts(15);
    const mailingId = await mailing(versionId, readers);

    const today = await start(documentMailing, [mailingId, ORIGIN]);

    // Ten sends were left of today's cap, counted across every mailing.
    await expect(today.returnValue).resolves.toBe('tomorrow');
    expect(received).toHaveLength(10);
    expect(await sentCount(mailingId)).toBe(10);
    expect((await mailingRow(mailingId)).status).toBe('sending');

    // The next UTC day: every send so far was yesterday's.
    await sql`update document_mailing_recipients set sent_at = sent_at - interval '1 day' where sent_at is not null`;
    const tomorrow = await start(documentMailing, [mailingId, ORIGIN]);

    await expect(tomorrow.returnValue).resolves.toBe('sent');
    expect(received.map((mail) => mail.to).sort()).toEqual(
      readers.map((reader) => reader.email).sort(),
    );
  });

  it('ends for the day, still sending, when Resend answers with its daily quota', async () => {
    useResend();
    quota = { name: 'daily_quota_exceeded', after: 2 };
    const { versionId } = await publishedVersion('privacy');
    const mailingId = await mailing(versionId, await accounts(5));

    const run = await start(documentMailing, [mailingId, ORIGIN]);

    await expect(run.returnValue).resolves.toBe('tomorrow');
    // Two taken, one refused, and the refusal is not retried.
    expect(attempts).toHaveLength(3);
    expect(await sentCount(mailingId)).toBe(2);
    expect(await mailingRow(mailingId)).toMatchObject({ status: 'sending', finished_at: null });
  });

  it('pauses the mailing when Resend answers with its monthly quota', async () => {
    useResend();
    quota = { name: 'monthly_quota_exceeded', after: 2 };
    const { versionId } = await publishedVersion('privacy');
    const mailingId = await mailing(versionId, await accounts(5));

    const run = await start(documentMailing, [mailingId, ORIGIN]);

    await expect(run.returnValue).resolves.toBe('paused');
    expect(attempts).toHaveLength(3);
    expect(await sentCount(mailingId)).toBe(2);
    expect(await mailingRow(mailingId)).toMatchObject({ status: 'paused', finished_at: null });
  });

  it('sends nothing for a paused mailing', async () => {
    const { versionId } = await publishedVersion('privacy');
    const mailingId = await mailing(versionId, await accounts(2), { status: 'paused' });

    const run = await start(documentMailing, [mailingId, ORIGIN]);

    await expect(run.returnValue).resolves.toBe('paused');
    expect(attempts).toEqual([]);
  });

  it('retries a batch the transport failed partway, mailing no one twice', async () => {
    const errors = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { versionId } = await publishedVersion('privacy');
    const readers = await accounts(4);
    const mailingId = await mailing(versionId, readers);
    // The first send is taken; the second is refused, which fails the batch's step.
    let taken = 0;
    const refuseSecond = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = input instanceof Request ? input.url : String(input);
      if (url.startsWith(MAILPIT_URL) && ++taken === 2) failNext = 1;
      return transport(input, init);
    };
    vi.stubGlobal('fetch', refuseSecond);

    const run = await start(documentMailing, [mailingId, ORIGIN]);

    await expect(run.returnValue).resolves.toBe('sent');
    vi.stubGlobal('fetch', transport);
    // Precondition: a send really failed, so the batch was retried.
    expect(attempts.length).toBeGreaterThan(readers.length);
    expect(received.map((mail) => mail.to).sort()).toEqual(
      readers.map((reader) => reader.email).sort(),
    );
    errors.mockRestore();
  });

  it('mails each account the document’s title, the summary and a link to the document', async () => {
    const { versionId, title } = await publishedVersion('privacy');
    const [reader] = await accounts(1);
    const mailingId = await mailing(versionId, [reader!]);

    const run = await start(documentMailing, [mailingId, ORIGIN]);

    await expect(run.returnValue).resolves.toBe('sent');
    expect(received).toHaveLength(1);
    expect(received[0]!.to).toBe(reader!.email);
    expect(received[0]!.subject).toContain(title);
    expect(received[0]!.text).toContain(SUMMARY);
    expect(received[0]!.text).toContain(`${ORIGIN}/privacy`);
    expect(received[0]!.text).not.toMatch(/agree/i);
  });

  it('tells each account, for the terms, that it will be asked to agree at its next visit', async () => {
    const { versionId } = await publishedVersion('terms');
    const [reader] = await accounts(1);
    const mailingId = await mailing(versionId, [reader!]);

    const run = await start(documentMailing, [mailingId, ORIGIN]);

    await expect(run.returnValue).resolves.toBe('sent');
    expect(received[0]!.text).toContain(`${ORIGIN}/terms`);
    expect(received[0]!.text).toMatch(/agree/i);
  });
});
