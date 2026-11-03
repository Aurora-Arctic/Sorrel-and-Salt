import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type postgres from 'postgres';
import { BOOTSTRAP_USER_ID } from '@/db/bootstrap';
import { mailBatchStep } from '@/modules/documents/jobs/document-mailing-steps';
import { MAILING_BATCH_SIZE, MAILING_DAILY_CAP } from '@/modules/documents/mailing-pace';
import { useTestDatabase } from '../../../support/db/database';
import { insertDocument, insertDocumentVersion } from '../../../support/db/insert-document';

// The document mailing's batch step, called directly as the job's run calls it. Mail goes through the real `deliver` to a
// stand-in Mailpit that answers fetch in this process, so a refused transport is refused the way production refuses it. Each
// test writes exactly the mailings and recipient rows it mails; the daily cap counts every mailing's sends today, so each
// test starts with none.

const DOMAIN = '@document-mailing-steps.test';
const ORIGIN = 'http://localhost:3000';
const MAILPIT_URL = 'http://mailpit.test';
const SUMMARY = 'We now keep sign-in records for ninety days.';

let sql: postgres.Sql;
useTestDatabase((client) => {
  sql = client;
});

/** Every address the stand-in took, in order. */
const received: string[] = [];
/** Runs before the stand-in takes a send, so a test can act mid-batch or slow the send down. */
let beforeTake: (to: string) => Promise<void> = async () => {};

const realFetch = globalThis.fetch;
async function transport(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const url = input instanceof Request ? input.url : String(input);
  if (!url.startsWith(MAILPIT_URL)) return realFetch(input, init);
  const mail = JSON.parse(String(init?.body)) as { To: { Email: string }[] };
  const to = mail.To[0]!.Email;
  await beforeTake(to);
  received.push(to);
  return Response.json({ ID: 'stand-in' });
}

beforeAll(() => {
  vi.stubGlobal('fetch', transport);
});

afterAll(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

beforeEach(async () => {
  received.length = 0;
  beforeTake = async () => {};
  vi.stubEnv('VERCEL_ENV', '');
  vi.stubEnv('MAIL_TRANSPORT', 'mailpit');
  vi.stubEnv('MAILPIT_URL', MAILPIT_URL);
  await sql`truncate document_mailing_recipients, document_mailings cascade`;
});

let made = 0;
/** `count` verified accounts; soft-deleted ones when `deleted`, which a mailing finds no address for. */
async function accounts(count: number, { deleted = false } = {}): Promise<{ id: string }[]> {
  const rows = Array.from({ length: count }, () => {
    made += 1;
    return {
      name: `Testwort Reader ${made}`,
      email: `reader${made}${DOMAIN}`,
      email_verified: true,
      deleted_at: deleted ? new Date() : null,
      deleted_by: deleted ? BOOTSTRAP_USER_ID : null,
      created_by: BOOTSTRAP_USER_ID,
      updated_by: BOOTSTRAP_USER_ID,
    };
  });
  return (await sql`insert into users ${sql(rows)} returning id`) as unknown as { id: string }[];
}

let documentsMade = 0;
/** A new document of this file's own, with one published version: their ids. */
async function publishedDocument(): Promise<{ documentId: string; versionId: string }> {
  documentsMade += 1;
  const documentId = await insertDocument(
    sql,
    { key: `fixture-policy-${documentsMade}` },
    BOOTSTRAP_USER_ID,
  );
  const versionId = await insertDocumentVersion(sql, documentId, { number: 1 }, BOOTSTRAP_USER_ID);
  return { documentId, versionId };
}

interface MailingSeed {
  status?: 'sending' | 'sent';
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

const statusOf = async (id: string) =>
  (await sql`select status from document_mailings where id = ${id}`)[0]!.status as string;

const sentCount = async (id: string) =>
  Number(
    (
      await sql`select count(*) as sent from document_mailing_recipients
        where mailing_id = ${id} and sent_at is not null`
    )[0]!.sent,
  );

/** Runs the step until it ends for a reason other than another batch, as the job's run does, and returns that reason. */
async function runToEnd(mailingId: string): Promise<string> {
  for (let batch = 0; batch < 20; batch += 1) {
    const result = await mailBatchStep(mailingId, ORIGIN);
    if (result !== 'more') return result;
  }
  throw new Error('the step asked for more batches twenty times');
}

describe('the document mailing batch step', () => {
  it('marks no one sent, and does not finish the mailing, when the transport refuses every send', async () => {
    const logged = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    // A deployment whose MAIL_TRANSPORT is not the one it may use: `deliver` refuses the send and returns false.
    vi.stubEnv('VERCEL_ENV', 'production');
    const { versionId } = await publishedDocument();
    const mailingId = await mailing(versionId, await accounts(3));

    try {
      // A fix may end the step or throw for a retry; either way the state it leaves is what counts.
      await mailBatchStep(mailingId, ORIGIN).catch(() => undefined);

      // Precondition: the transport really refused, rather than nothing being tried.
      expect(logged.mock.calls.some(([line]) => /refused MAIL_TRANSPORT/.test(String(line)))).toBe(
        true,
      );
      expect(received).toEqual([]);
      expect(await sentCount(mailingId)).toBe(0);
      expect(await statusOf(mailingId)).not.toBe('sent');
    } finally {
      logged.mockRestore();
    }
  });

  it('moves a mailing whose version was deleted out of sending, so the mailing behind it starts', async () => {
    const stuck = await publishedDocument();
    const stuckId = await mailing(stuck.versionId, await accounts(2), { startedSecondsAgo: 3600 });
    const next = await publishedDocument();
    const nextReaders = await accounts(2);
    const nextId = await mailing(next.versionId, nextReaders);
    // Precondition: the older mailing holds the queue, so the newer one waits.
    expect(await mailBatchStep(nextId, ORIGIN)).toBe('queued');

    await sql`update document_versions set deleted_at = now(), deleted_by = ${BOOTSTRAP_USER_ID}
      where id = ${stuck.versionId}`;
    await mailBatchStep(stuckId, ORIGIN);

    expect(received).toEqual([]);
    expect(await statusOf(stuckId)).not.toBe('sending');
    expect(await mailBatchStep(nextId, ORIGIN)).toBe('sent');
    expect(await sentCount(nextId)).toBe(nextReaders.length);
  });

  it('moves a mailing whose document was deleted out of sending, so the mailing behind it starts', async () => {
    const stuck = await publishedDocument();
    const stuckId = await mailing(stuck.versionId, await accounts(2), { startedSecondsAgo: 3600 });
    const next = await publishedDocument();
    const nextReaders = await accounts(2);
    const nextId = await mailing(next.versionId, nextReaders);
    expect(await mailBatchStep(nextId, ORIGIN)).toBe('queued');

    await sql`update documents set deleted_at = now(), deleted_by = ${BOOTSTRAP_USER_ID}
      where id = ${stuck.documentId}`;
    await mailBatchStep(stuckId, ORIGIN);

    expect(received).toEqual([]);
    expect(await statusOf(stuckId)).not.toBe('sending');
    expect(await mailBatchStep(nextId, ORIGIN)).toBe('sent');
    expect(await sentCount(nextId)).toBe(nextReaders.length);
  });

  it('two batch steps of a mailing running at once send no more than the day has left, and mail no one twice', async () => {
    const earlier = await publishedDocument();
    const left = 10;
    await mailing(earlier.versionId, await accounts(MAILING_DAILY_CAP - left), {
      status: 'sent',
      allSent: true,
    });
    const { versionId } = await publishedDocument();
    const mailingId = await mailing(versionId, await accounts(MAILING_BATCH_SIZE));
    // Each send takes a moment, so two steps started together are both partway through their batch at once.
    beforeTake = () => new Promise((resolve) => setTimeout(resolve, 20));

    await Promise.all([mailBatchStep(mailingId, ORIGIN), mailBatchStep(mailingId, ORIGIN)]);

    // Precondition: the steps did send, so an empty result is not what passes.
    expect(received.length).toBeGreaterThan(0);
    expect(received.length).toBeLessThanOrEqual(left);
    expect(new Set(received).size).toBe(received.length);
  });

  it('sends nothing more once the mailing is replaced partway through a batch', async () => {
    const { versionId } = await publishedDocument();
    const mailingId = await mailing(versionId, await accounts(5));
    // What the service leaves when an admin mails the document again while this batch is sending.
    beforeTake = async () => {
      await sql`update document_mailings set status = 'replaced' where id = ${mailingId}`;
    };

    await mailBatchStep(mailingId, ORIGIN);

    expect(received).toHaveLength(1);
    expect(await statusOf(mailingId)).toBe('replaced');
  });

  it('finishes a mailing whose accounts are gone, without using the day’s allowance', async () => {
    const gone = await publishedDocument();
    const goneId = await mailing(gone.versionId, await accounts(5, { deleted: true }), {
      startedSecondsAgo: 3600,
    });

    // Every account is gone, so the mailing has no one to mail and ends.
    expect(await runToEnd(goneId)).toBe('sent');
    expect(received).toEqual([]);

    const { versionId } = await publishedDocument();
    const mailingId = await mailing(versionId, await accounts(MAILING_DAILY_CAP + 5));

    expect(await runToEnd(mailingId)).toBe('tomorrow');
    // The whole day's allowance went to mail that was sent, none to the accounts skipped.
    expect(received).toHaveLength(MAILING_DAILY_CAP);
  });
});
