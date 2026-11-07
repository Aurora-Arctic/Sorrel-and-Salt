import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type postgres from 'postgres';
import { BOOTSTRAP_USER_ID } from '@/db/bootstrap';
import { mailBatchStep } from '@/modules/documents/jobs/document-mailing-steps';
import { MAILING_BATCH_SIZE, MAILING_DAILY_CAP } from '@/modules/documents/mailing-pace';
import { useTestDatabase } from '../../../support/db/database';
import {
  insertDocument,
  insertDocumentMailing,
  insertDocumentVersion,
} from '../../../support/db/insert-document';

// Mail goes through the real `deliver` to a stand-in Mailpit answering fetch in this process; the daily cap counts every mailing's sends today, so each test starts with none.

const DOMAIN = '@document-mailing-steps.test';
const ORIGIN = 'http://localhost:3000';
const MAILPIT_URL = 'http://mailpit.test';
const SUMMARY = 'We now keep sign-in records for ninety days.';

let sql: postgres.Sql;
useTestDatabase((client) => {
  sql = client;
});

const received: string[] = [];
let beforeTake: (to: string) => Promise<void> = async () => {};
/** Addresses the stand-in answers with this status and error name, as Resend answers a rejected address. */
const refused = new Map<string, { status: number; name: string }>();

const realFetch = globalThis.fetch;
async function transport(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const url = input instanceof Request ? input.url : String(input);
  if (!url.startsWith(MAILPIT_URL)) return realFetch(input, init);
  const mail = JSON.parse(String(init?.body)) as { To: { Email: string }[] };
  const to = mail.To[0]!.Email;
  const refusal = refused.get(to);
  if (refusal) {
    return Response.json(
      { statusCode: refusal.status, name: refusal.name },
      { status: refusal.status },
    );
  }
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
  refused.clear();
  vi.stubEnv('VERCEL_ENV', '');
  vi.stubEnv('MAIL_TRANSPORT', 'mailpit');
  vi.stubEnv('MAILPIT_URL', MAILPIT_URL);
  await sql`truncate document_mailing_recipients, document_mailings cascade`;
});

let made = 0;
async function accounts(
  count: number,
  { deleted = false } = {},
): Promise<{ id: string; email: string }[]> {
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
  return (await sql`insert into users ${sql(rows)} returning id, email`) as unknown as {
    id: string;
    email: string;
  }[];
}

let documentsMade = 0;
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
  startedSecondsAgo?: number;
  allSent?: boolean;
}

async function mailing(
  versionIds: string | readonly string[],
  recipients: { id: string }[],
  { status = 'sending', startedSecondsAgo = 0, allSent = false }: MailingSeed = {},
): Promise<string> {
  const id = await insertDocumentMailing(
    sql,
    {
      items: [versionIds].flat().map((versionId) => ({ versionId, summary: SUMMARY })),
      status,
      recipient_count: recipients.length,
      startedSecondsAgo,
    },
    BOOTSTRAP_USER_ID,
  );
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

const recipientRows = async (id: string) =>
  sql`select user_id, sent_at, skipped_at from document_mailing_recipients where mailing_id = ${id}`;

const sentCount = async (id: string) =>
  Number(
    (
      await sql`select count(*) as sent from document_mailing_recipients
        where mailing_id = ${id} and sent_at is not null`
    )[0]!.sent,
  );

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

  it('mails the documents of a joint mailing still live once one of its versions is deleted', async () => {
    const kept = await publishedDocument();
    const gone = await publishedDocument();
    const readers = await accounts(2);
    const mailingId = await mailing([kept.versionId, gone.versionId], readers);

    await sql`update document_versions set deleted_at = now(), deleted_by = ${BOOTSTRAP_USER_ID}
      where id = ${gone.versionId}`;

    expect(await mailBatchStep(mailingId, ORIGIN)).toBe('sent');
    expect(await sentCount(mailingId)).toBe(readers.length);
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

    expect(await runToEnd(goneId)).toBe('sent');
    expect(received).toEqual([]);
    const goneRows = await recipientRows(goneId);
    expect(goneRows).toHaveLength(5);
    for (const row of goneRows) {
      expect(row).toMatchObject({ sent_at: null, skipped_at: expect.any(Date) });
    }

    const { versionId } = await publishedDocument();
    const mailingId = await mailing(versionId, await accounts(MAILING_DAILY_CAP + 5));

    expect(await runToEnd(mailingId)).toBe('tomorrow');
    // The whole day's allowance went to mail that was sent, none to the accounts skipped.
    expect(received).toHaveLength(MAILING_DAILY_CAP);
  });

  it('skips an account the provider refuses with a 4xx, and mails the rest of the mailing', async () => {
    const logged = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { versionId } = await publishedDocument();
    const readers = await accounts(3);
    const rejected = readers[1]!;
    refused.set(rejected.email, { status: 422, name: 'validation_error' });
    const mailingId = await mailing(versionId, readers);

    try {
      expect(await runToEnd(mailingId)).toBe('sent');
    } finally {
      logged.mockRestore();
    }

    expect(received.sort()).toEqual([readers[0]!.email, readers[2]!.email].sort());
    const rows = await recipientRows(mailingId);
    expect(rows.find((row) => row.user_id === rejected.id)).toMatchObject({
      sent_at: null,
      skipped_at: expect.any(Date),
    });
    for (const reader of [readers[0]!, readers[2]!]) {
      expect(rows.find((row) => row.user_id === reader.id)).toMatchObject({
        sent_at: expect.any(Date),
        skipped_at: null,
      });
    }
  });

  it('does not hold the mailing behind one whose account the provider refuses with a 4xx', async () => {
    const logged = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const first = await publishedDocument();
    const [rejected] = await accounts(1);
    refused.set(rejected!.email, { status: 422, name: 'validation_error' });
    const firstId = await mailing(first.versionId, [rejected!], { startedSecondsAgo: 3600 });
    const next = await publishedDocument();
    const nextReaders = await accounts(2);
    const nextId = await mailing(next.versionId, nextReaders);
    // Precondition: the first mailing holds the queue.
    expect(await mailBatchStep(nextId, ORIGIN)).toBe('queued');

    try {
      await mailBatchStep(firstId, ORIGIN).catch(() => undefined);
    } finally {
      logged.mockRestore();
    }

    expect(await statusOf(firstId)).toBe('sent');
    expect(await mailBatchStep(nextId, ORIGIN)).toBe('sent');
    expect(received.sort()).toEqual(nextReaders.map((reader) => reader.email).sort());
  });

  it('does not skip an account on a 429 that is not a quota answer, leaving it for a retry', async () => {
    const logged = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { versionId } = await publishedDocument();
    const [reader] = await accounts(1);
    refused.set(reader!.email, { status: 429, name: 'rate_limit_exceeded' });
    const mailingId = await mailing(versionId, [reader!]);

    try {
      await expect(mailBatchStep(mailingId, ORIGIN)).rejects.toThrow();
    } finally {
      logged.mockRestore();
    }

    expect(await recipientRows(mailingId)).toEqual([
      expect.objectContaining({ sent_at: null, skipped_at: null }),
    ]);
    expect(await statusOf(mailingId)).toBe('sending');
  });
});
