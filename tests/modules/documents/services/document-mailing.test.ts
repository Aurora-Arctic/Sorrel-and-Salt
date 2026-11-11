import { beforeEach, describe, expect, it, vi } from 'vitest';
import type postgres from 'postgres';
import { BOOTSTRAP_USER_ID } from '@/db/bootstrap';
import { Forbidden, NotFound, ValidationError } from '@/lib/errors';
import { assertRunArguments } from '@/lib/jobs/run-arguments';
import type { Session } from '@/lib/session';
import { SIGNED_OUT_SENDER_ID } from '@/lib/support-sender';
import { SYSTEM_ACTOR_ID } from '@/lib/system-actor';
import {
  emailDocumentsToEveryAccount,
  readDocumentMailings,
  resumeDocumentMailing,
  startDailyDocumentMailing,
} from '@/modules/documents';
import type { DocumentMailingNotifier } from '@/modules/documents';
import { documentMailing } from '@/modules/documents/jobs/document-mailing';
import {
  MAILING_DAILY_CAP,
  documentMailingHookToken,
  mailingDays,
} from '@/modules/documents/mailing-pace';
import { assertCurator } from '@/modules/identity';
import { A, B, E, F, asUser } from '../../../support/as-user';
import { useTestDatabase } from '../../../support/db/database';
import {
  insertDocument,
  insertDocumentMailing,
  insertDocumentVersion,
} from '../../../support/db/insert-document';
import { ORIGIN } from '../../../support/constants';

const { startJob, jobTokenActive } = vi.hoisted(() => ({
  startJob: vi.fn(async (..._args: unknown[]) => 'run-id'),
  jobTokenActive: vi.fn(async (_token: string) => false),
}));
vi.mock('@/lib/jobs', () => ({ startJob, jobTokenActive }));

const notifier: DocumentMailingNotifier = { origin: async () => ORIGIN };
const SUMMARY = 'We now keep sign-in records for ninety days.';

let sql: postgres.Sql;
useTestDatabase((client) => {
  sql = client;
});

let privacyId: string;
let privacyV1: string;
let privacyV2: string;
let termsId: string;
let termsV1: string;

beforeEach(async () => {
  startJob.mockClear();
  jobTokenActive.mockReset();
  jobTokenActive.mockResolvedValue(false);
  await sql`truncate documents cascade`;
  privacyId = await insertDocument(sql, { key: 'privacy', title: 'Fixture Policy' }, E.id);
  privacyV1 = await insertDocumentVersion(sql, privacyId, { number: 1 }, E.id);
  privacyV2 = await insertDocumentVersion(
    sql,
    privacyId,
    { number: 2, published_at: '2026-04-05 12:30:00' },
    E.id,
  );
  await insertDocumentVersion(sql, privacyId, { number: 3, status: 'draft' }, E.id);
  termsId = await insertDocument(sql, { key: 'terms', title: 'Fixture Terms' }, E.id);
  termsV1 = await insertDocumentVersion(sql, termsId, { number: 1 }, E.id);
});

let made = 0;
async function accounts(
  count: number,
  fields: { email_verified?: boolean; deleted?: boolean; domain?: string } = {},
): Promise<string[]> {
  const { email_verified = true, deleted = false, domain = 'mailing-service.test' } = fields;
  const rows = Array.from({ length: count }, () => {
    made += 1;
    return {
      name: `Testwort Reader ${made}`,
      email: `reader${made}@${domain}`,
      email_verified,
      deleted_at: deleted ? new Date() : null,
      deleted_by: deleted ? BOOTSTRAP_USER_ID : null,
      created_by: BOOTSTRAP_USER_ID,
      updated_by: BOOTSTRAP_USER_ID,
    };
  });
  const inserted = await sql`insert into users ${sql(rows)} returning id`;
  return inserted.map((row) => row.id as string);
}

interface MailingSeed {
  status?: 'sending' | 'sent' | 'replaced' | 'paused';
  sent?: number;
  sentAt?: 'today' | 'yesterday';
  startedSecondsAgo?: number;
}

async function mailing(
  versionIds: readonly string[],
  recipients: string[],
  { status = 'sending', sent = 0, sentAt = 'today', startedSecondsAgo = 0 }: MailingSeed = {},
): Promise<string> {
  const id = await insertDocumentMailing(
    sql,
    {
      items: versionIds.map((versionId) => ({ versionId, summary: SUMMARY })),
      status,
      recipient_count: recipients.length,
      startedSecondsAgo,
    },
    E.id,
  );
  const when = new Date(Date.now() - (sentAt === 'yesterday' ? 86_400_000 : 0));
  await sql`
    insert into document_mailing_recipients ${sql(
      recipients.map((userId, index) => ({
        mailing_id: id as string,
        user_id: userId,
        sent_at: index < sent ? when : null,
        created_by: E.id,
        updated_by: E.id,
      })),
    )}`;
  return id as string;
}

const mailingRows = () =>
  sql`select id, status::text as status, recipient_count, finished_at, created_by
      from document_mailings where deleted_at is null order by created_at, id`;

const itemsOf = async (mailingId: string) =>
  (
    await sql`select document_version_id, summary from document_mailing_items
      where mailing_id = ${mailingId} and deleted_at is null order by summary`
  ).map((row) => ({
    versionId: row.document_version_id as string,
    summary: row.summary as string,
  }));

const statusOf = async (mailingId: string) =>
  (await sql`select status::text as status from document_mailings where id = ${mailingId}`)[0]!
    .status;

const publishTermsV2 = () =>
  insertDocumentVersion(sql, termsId, { number: 2, published_at: '2026-04-06 09:00:00' }, E.id);

const refusalOf = (promise: Promise<unknown>) =>
  promise.then(
    () => null,
    (error: unknown) => error,
  );

const recipientsOf = async (mailingId: string) =>
  (
    await sql`select user_id, sent_at from document_mailing_recipients where mailing_id = ${mailingId}`
  ).map((row) => ({ userId: row.user_id as string, sentAt: row.sent_at as Date | null }));

describe('readDocumentMailings', () => {
  it('answers each pending document, with how many accounts a mailing would reach and in how many days', async () => {
    const overview = await readDocumentMailings(asUser(E));

    expect(overview.pending).toEqual([
      {
        documentId: privacyId,
        versionId: privacyV2,
        key: 'privacy',
        title: 'Fixture Policy',
        versionNumber: 2,
        inMailing: false,
      },
    ]);
    expect(overview).toMatchObject({ canSend: true, open: [], lastSent: null });
    expect(overview.days).toBe(mailingDays(overview.accountCount));
  });

  it('counts a live, verified account, and no unverified, deleted or .invalid one', async () => {
    const before = (await readDocumentMailings(asUser(E))).accountCount;

    await accounts(1, { email_verified: false });
    await accounts(1, { deleted: true });
    await accounts(1, { domain: 'provider.invalid' });
    expect((await readDocumentMailings(asUser(E))).accountCount).toBe(before);

    await accounts(1);
    expect((await readDocumentMailings(asUser(E))).accountCount).toBe(before + 1);
  });

  it('answers a sending mailing with every document it covers and how many it has reached', async () => {
    const termsV2 = await publishTermsV2();
    await mailing([privacyV2, termsV2], await accounts(3), { sent: 1 });

    const overview = await readDocumentMailings(asUser(E));

    expect(overview.open).toHaveLength(1);
    expect(overview.open[0]).toMatchObject({
      state: 'sending',
      reached: 1,
      recipientCount: 3,
      startedAt: expect.any(Date),
      finishedAt: null,
    });
    expect(overview.open[0]!.documents).toEqual([
      { key: 'privacy', title: 'Fixture Policy', versionNumber: 2 },
      { key: 'terms', title: 'Fixture Terms', versionNumber: 2 },
    ]);
  });

  it('answers a sending mailing that has sent the daily cap today as waiting for tomorrow', async () => {
    await mailing([privacyV2], await accounts(MAILING_DAILY_CAP + 1), { sent: MAILING_DAILY_CAP });

    expect((await readDocumentMailings(asUser(E))).open[0]).toMatchObject({
      state: 'waiting',
      reached: MAILING_DAILY_CAP,
    });
  });

  it('answers the same mailing as sending when those sends were yesterday', async () => {
    await mailing([privacyV2], await accounts(MAILING_DAILY_CAP + 1), {
      sent: MAILING_DAILY_CAP,
      sentAt: 'yesterday',
    });

    expect((await readDocumentMailings(asUser(E))).open[0]?.state).toBe('sending');
  });

  it('answers a sending mailing behind an older sending one as queued', async () => {
    // Two open mailings sit side by side only as a mailing written before joint mailings left them.
    const older = await mailing([termsV1], await accounts(2), { startedSecondsAgo: 3600 });
    const newer = await mailing([privacyV2], await accounts(2));

    const { open } = await readDocumentMailings(asUser(E));

    expect(open.map((summary) => [summary.id, summary.state])).toEqual([
      [older, 'sending'],
      [newer, 'queued'],
    ]);
  });

  it('answers a paused mailing as paused', async () => {
    await mailing([privacyV2], await accounts(3), { status: 'paused', sent: 2 });

    expect((await readDocumentMailings(asUser(E))).open[0]).toMatchObject({
      state: 'paused',
      reached: 2,
      finishedAt: null,
    });
  });

  it('answers the newest sent mailing as the last sent, and leaves its version out of the pending', async () => {
    const sent = await mailing([privacyV2], await accounts(2), { status: 'sent', sent: 2 });

    const overview = await readDocumentMailings(asUser(E));

    expect(overview.lastSent).toMatchObject({
      id: sent,
      state: 'sent',
      reached: 2,
      recipientCount: 2,
      finishedAt: expect.any(Date),
      documents: [{ key: 'privacy', title: 'Fixture Policy', versionNumber: 2 }],
    });
    expect(overview.pending).toEqual([]);
    expect(overview.canSend).toBe(false);
  });

  it('marks a pending document a sending or paused mailing covers, and answers it cannot send when every one is', async () => {
    const termsV2 = await publishTermsV2();
    await mailing([privacyV2], await accounts(1), { status: 'paused' });

    const some = await readDocumentMailings(asUser(E));
    expect(some.pending.map((pending) => [pending.key, pending.inMailing])).toEqual([
      ['privacy', true],
      ['terms', false],
    ]);
    expect(some.canSend).toBe(true);

    await mailing([termsV2], await accounts(1));
    const every = await readDocumentMailings(asUser(E));
    expect(every.pending.every((pending) => pending.inMailing)).toBe(true);
    expect(every.canSend).toBe(false);
  });

  it('keeps a version only a replaced mailing covers pending, and sendable', async () => {
    await mailing([privacyV2], await accounts(1), { status: 'replaced' });

    const overview = await readDocumentMailings(asUser(E));

    expect(overview.pending).toEqual([
      expect.objectContaining({ versionId: privacyV2, inMailing: false }),
    ]);
    expect(overview.canSend).toBe(true);
  });
});

describe('emailDocumentsToEveryAccount', () => {
  it('writes one sending mailing of every pending document to every account it counts, and starts its run', async () => {
    const termsV2 = await publishTermsV2();
    const [unverified] = await accounts(1, { email_verified: false });
    const [deleted] = await accounts(1, { deleted: true });
    const [invalid] = await accounts(1, { domain: 'provider.invalid' });
    const [reader] = await accounts(1);
    const { accountCount } = await readDocumentMailings(asUser(E));

    const overview = await emailDocumentsToEveryAccount(
      asUser(E),
      {
        summaries: [
          { versionId: termsV2, summary: 'Testwort terms changed.' },
          { versionId: privacyV2, summary: '  Testwort policy changed.  ' },
        ],
      },
      notifier,
    );

    const rows = await mailingRows();
    expect(rows).toHaveLength(1);
    const [row] = rows;
    expect(row).toMatchObject({
      status: 'sending',
      recipient_count: accountCount,
      finished_at: null,
      created_by: E.id,
    });
    expect(await itemsOf(row!.id as string)).toEqual([
      { versionId: privacyV2, summary: 'Testwort policy changed.' },
      { versionId: termsV2, summary: 'Testwort terms changed.' },
    ]);
    const recipients = await recipientsOf(row!.id as string);
    const ids = recipients.map((recipient) => recipient.userId);
    expect(ids).toHaveLength(accountCount);
    expect(ids).toEqual(expect.arrayContaining([A.id, B.id, E.id, F.id, reader]));
    for (const excluded of [
      unverified,
      deleted,
      invalid,
      BOOTSTRAP_USER_ID,
      SYSTEM_ACTOR_ID,
      SIGNED_OUT_SENDER_ID,
    ]) {
      expect(ids).not.toContain(excluded);
    }
    expect(recipients.every((recipient) => recipient.sentAt === null)).toBe(true);
    expect(startJob).toHaveBeenCalledExactlyOnceWith(documentMailing, [row!.id, ORIGIN]);
    expect(() => assertRunArguments([row!.id, ORIGIN])).not.toThrow();
    expect(overview.open).toEqual([
      expect.objectContaining({ id: row!.id, state: 'sending', reached: 0 }),
    ]);
    expect(overview.canSend).toBe(false);
  });

  it('marks every live sending and paused mailing replaced, of any document, and leaves a sent one alone', async () => {
    const termsV2 = await publishTermsV2();
    const sending = await mailing([privacyV2], await accounts(2), {
      sent: 1,
      startedSecondsAgo: 60,
    });
    const paused = await mailing([privacyV1], await accounts(2), {
      status: 'paused',
      startedSecondsAgo: 120,
    });
    const sent = await mailing([termsV1], await accounts(2), {
      status: 'sent',
      sent: 2,
      startedSecondsAgo: 180,
    });

    await emailDocumentsToEveryAccount(
      asUser(E),
      {
        summaries: [
          { versionId: privacyV2, summary: SUMMARY },
          { versionId: termsV2, summary: SUMMARY },
        ],
      },
      notifier,
    );

    expect(await statusOf(sending)).toBe('replaced');
    expect(await statusOf(paused)).toBe('replaced');
    expect(await statusOf(sent)).toBe('sent');
    expect((await recipientsOf(sending)).filter((recipient) => recipient.sentAt)).toHaveLength(1);
  });

  it('mails again a version only a replaced mailing covered', async () => {
    const replaced = await mailing([privacyV2], await accounts(1), { status: 'replaced' });

    await emailDocumentsToEveryAccount(
      asUser(E),
      { summaries: [{ versionId: privacyV2, summary: SUMMARY }] },
      notifier,
    );

    const started = (await mailingRows()).find((row) => row.id !== replaced);
    expect(started).toMatchObject({ status: 'sending' });
    expect(await itemsOf(started!.id as string)).toEqual([
      { versionId: privacyV2, summary: SUMMARY },
    ]);
  });

  it('refuses when no document is pending, writing nothing and starting nothing', async () => {
    const sent = await mailing([privacyV2], await accounts(2), { status: 'sent', sent: 2 });

    const refusal = await refusalOf(
      emailDocumentsToEveryAccount(
        asUser(E),
        { summaries: [{ versionId: privacyV2, summary: SUMMARY }] },
        notifier,
      ),
    );

    expect(refusal).toBeInstanceOf(ValidationError);
    expect((await mailingRows()).map((row) => row.id)).toEqual([sent]);
    expect(startJob).not.toHaveBeenCalled();
  });

  it('refuses when every pending document is already in a sending or paused mailing', async () => {
    const open = await mailing([privacyV2], await accounts(2), { status: 'paused' });

    const refusal = await refusalOf(
      emailDocumentsToEveryAccount(
        asUser(E),
        { summaries: [{ versionId: privacyV2, summary: SUMMARY }] },
        notifier,
      ),
    );

    expect(refusal).toBeInstanceOf(ValidationError);
    expect(await mailingRows()).toEqual([expect.objectContaining({ id: open, status: 'paused' })]);
    expect(startJob).not.toHaveBeenCalled();
  });

  it('refuses summaries that leave out a pending document, or name a version that is not pending', async () => {
    const termsV2 = await publishTermsV2();

    const missing = await refusalOf(
      emailDocumentsToEveryAccount(
        asUser(E),
        { summaries: [{ versionId: privacyV2, summary: SUMMARY }] },
        notifier,
      ),
    );
    const extra = await refusalOf(
      emailDocumentsToEveryAccount(
        asUser(E),
        {
          summaries: [
            { versionId: privacyV2, summary: SUMMARY },
            { versionId: termsV2, summary: SUMMARY },
            { versionId: privacyV1, summary: SUMMARY },
          ],
        },
        notifier,
      ),
    );

    expect(missing).toBeInstanceOf(ValidationError);
    expect(extra).toBeInstanceOf(ValidationError);
    expect(await mailingRows()).toEqual([]);
    expect(startJob).not.toHaveBeenCalled();
  });

  it('refuses a blank summary on that document’s summary field', async () => {
    const termsV2 = await publishTermsV2();

    const refusal = await refusalOf(
      emailDocumentsToEveryAccount(
        asUser(E),
        {
          summaries: [
            { versionId: privacyV2, summary: SUMMARY },
            { versionId: termsV2, summary: '   ' },
          ],
        },
        notifier,
      ),
    );

    expect(refusal).toBeInstanceOf(ValidationError);
    expect((refusal as ValidationError).issues.map((issue) => issue.path)).toEqual([
      ['summaries', 1, 'summary'],
    ]);
    expect(await mailingRows()).toEqual([]);
    expect(startJob).not.toHaveBeenCalled();
  });

  it('refuses a version id that is not a uuid on that document’s version field', async () => {
    const termsV2 = await publishTermsV2();

    const refusal = await refusalOf(
      emailDocumentsToEveryAccount(
        asUser(E),
        {
          summaries: [
            { versionId: privacyV2, summary: SUMMARY },
            { versionId: `${termsV2}-not-a-uuid`, summary: SUMMARY },
          ],
        },
        notifier,
      ),
    );

    expect(refusal).toBeInstanceOf(ValidationError);
    expect((refusal as ValidationError).issues).toEqual([
      expect.objectContaining({
        path: ['summaries', 1, 'versionId'],
        message: 'Choose a document version from the list',
      }),
    ]);
    expect(await mailingRows()).toEqual([]);
    expect(startJob).not.toHaveBeenCalled();
  });

  it('starts one mailing when two keepers send at once, and refuses the other', async () => {
    await accounts(3);
    const send = () =>
      emailDocumentsToEveryAccount(
        asUser(E),
        { summaries: [{ versionId: privacyV2, summary: SUMMARY }] },
        notifier,
      );

    const outcomes = await Promise.allSettled([send(), send(), send()]);

    expect(outcomes.filter((outcome) => outcome.status === 'fulfilled')).toHaveLength(1);
    const refused = outcomes.filter((outcome) => outcome.status === 'rejected');
    expect(refused).toHaveLength(2);
    for (const outcome of refused) {
      expect((outcome as PromiseRejectedResult).reason).toBeInstanceOf(ValidationError);
    }
    expect(await mailingRows()).toEqual([expect.objectContaining({ status: 'sending' })]);
    expect(startJob).toHaveBeenCalledTimes(1);
  });
});

describe('resumeDocumentMailing', () => {
  it('sets a paused mailing sending again and starts its run, leaving what it has sent', async () => {
    const paused = await mailing([privacyV2], await accounts(3), { status: 'paused', sent: 2 });

    const overview = await resumeDocumentMailing(asUser(E), paused, notifier);

    expect(await mailingRows()).toEqual([
      expect.objectContaining({ id: paused, status: 'sending', finished_at: null }),
    ]);
    expect((await recipientsOf(paused)).filter((recipient) => recipient.sentAt)).toHaveLength(2);
    expect(startJob).toHaveBeenCalledExactlyOnceWith(documentMailing, [paused, ORIGIN]);
    expect(overview.open).toEqual([expect.objectContaining({ id: paused, state: 'sending' })]);
  });

  it('resumes a mailing whose one item is a version that has since been superseded', async () => {
    const paused = await mailing([privacyV1], await accounts(2), { status: 'paused' });

    await resumeDocumentMailing(asUser(E), paused, notifier);

    expect(await statusOf(paused)).toBe('sending');
    expect(startJob).toHaveBeenCalledExactlyOnceWith(documentMailing, [paused, ORIGIN]);
  });

  it.each([['sending'], ['sent'], ['replaced']] as const)(
    'refuses a %s mailing, changing nothing and starting nothing',
    async (status) => {
      const id = await mailing([privacyV2], await accounts(2), { status });

      await expect(resumeDocumentMailing(asUser(E), id, notifier)).rejects.toBeInstanceOf(
        ValidationError,
      );
      expect(await statusOf(id)).toBe(status);
      expect(startJob).not.toHaveBeenCalled();
    },
  );

  it('throws NotFound for an id with no mailing', async () => {
    await expect(
      resumeDocumentMailing(asUser(E), '00000000-0000-4000-8000-000000000000', notifier),
    ).rejects.toBeInstanceOf(NotFound);
  });
});

describe('startDailyDocumentMailing', () => {
  it('starts a run for the oldest sending mailing alone', async () => {
    await mailing([privacyV1], await accounts(1), { status: 'paused', startedSecondsAgo: 7200 });
    const oldest = await mailing([termsV1], await accounts(1), { startedSecondsAgo: 3600 });
    await mailing([privacyV2], await accounts(1));

    await startDailyDocumentMailing(ORIGIN);

    expect(startJob).toHaveBeenCalledExactlyOnceWith(documentMailing, [oldest, ORIGIN]);
  });

  it('starts nothing while a run still holds the oldest sending mailing’s hook token', async () => {
    const oldest = await mailing([termsV1], await accounts(1), { startedSecondsAgo: 3600 });
    // A run of the oldest mailing is asleep between batches, across midnight, holding its token.
    jobTokenActive.mockImplementation(async (token) => token === documentMailingHookToken(oldest));

    await startDailyDocumentMailing(ORIGIN);

    // Precondition: the start looked the token up, so the refusal is the lookup’s.
    expect(jobTokenActive).toHaveBeenCalledWith(documentMailingHookToken(oldest));
    expect(startJob).not.toHaveBeenCalled();
  });

  it('starts nothing when no mailing is sending', async () => {
    await mailing([privacyV2], await accounts(1), { status: 'sent', sent: 1 });
    await mailing([privacyV1], await accounts(1), { status: 'paused' });

    await startDailyDocumentMailing(ORIGIN);

    expect(startJob).not.toHaveBeenCalled();
  });
});

// Direct-id calls: E's same call succeeds, A holds no site role, B is a member and F passes assertCurator, so each refusal is the admin check's.
describe('the mailing services are a keeper’s alone', () => {
  let pausedId: string;
  beforeEach(async () => {
    pausedId = await mailing([privacyV1], await accounts(2), { status: 'paused' });
  });

  const CALLS: [string, (session: Session) => Promise<unknown>][] = [
    ['readDocumentMailings', (session) => readDocumentMailings(session)],
    [
      'emailDocumentsToEveryAccount',
      (session) =>
        emailDocumentsToEveryAccount(
          session,
          { summaries: [{ versionId: privacyV2, summary: SUMMARY }] },
          notifier,
        ),
    ],
    ['resumeDocumentMailing', (session) => resumeDocumentMailing(session, pausedId, notifier)],
  ];

  it.each(CALLS)('%s refuses a curator, a member and a coven owner', async (_name, call) => {
    expect(asUser(A).role).toBe('user');
    expect(asUser(B).role).toBe('user');
    expect(() => assertCurator(asUser(F))).not.toThrow();
    const mailingsBefore = await sql`select id, status from document_mailings order by id`;

    for (const who of [F, B, A]) {
      await expect(call(asUser(who)), who.id).rejects.toBeInstanceOf(Forbidden);
    }

    expect(await sql`select id, status from document_mailings order by id`).toEqual(mailingsBefore);
    expect(startJob).not.toHaveBeenCalled();
    await call(asUser(E));
  });
});
