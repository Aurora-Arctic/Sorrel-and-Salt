import { beforeEach, describe, expect, it, vi } from 'vitest';
import type postgres from 'postgres';
import { BOOTSTRAP_USER_ID } from '@/db/bootstrap';
import { Forbidden, NotFound, ValidationError } from '@/lib/errors';
import { assertRunArguments } from '@/lib/jobs/run-arguments';
import type { Session } from '@/lib/session';
import { SIGNED_OUT_SENDER_ID } from '@/lib/support-sender';
import { SYSTEM_ACTOR_ID } from '@/lib/system-actor';
import {
  emailDocumentToEveryAccount,
  readDocumentMailing,
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
import { insertDocument, insertDocumentVersion } from '../../../support/db/insert-document';

// Emailing every account about a document's published version: the read the edit page and its confirmation show, the write that
// starts a mailing, an admin's resume of a paused one, and the daily start that carries a mailing on to the next UTC day. Each
// is an admin's alone, through assertSiteAdmin. The run that sends the mail is tests/workflows/document-mailing.test.ts; the
// signed-out caller is refused at the GraphQL scope (tests/db/graphql-query-scopes.test.ts).

const { startJob, jobTokenActive } = vi.hoisted(() => ({
  startJob: vi.fn(async (..._args: unknown[]) => 'run-id'),
  jobTokenActive: vi.fn(async (_token: string) => false),
}));
vi.mock('@/lib/jobs', () => ({ startJob, jobTokenActive }));

const ORIGIN = 'http://localhost:3000';
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
  // The privacy policy published at versions 1 and 2, with 3 an open draft; the terms at version 1. No disclaimer row.
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
/** `count` accounts, verified unless `fields` says otherwise. */
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
  /** How many recipients are written as sent, and when. */
  sent?: number;
  sentAt?: 'today' | 'yesterday';
  startedSecondsAgo?: number;
}

/** A mailing of `versionId` to `recipients`, written raw as the service and the run would leave it. */
async function mailing(
  versionId: string,
  recipients: string[],
  { status = 'sending', sent = 0, sentAt = 'today', startedSecondsAgo = 0 }: MailingSeed = {},
): Promise<string> {
  const [{ id }] = await sql`
    insert into document_mailings
      (document_version_id, summary, status, recipient_count, finished_at, created_at, created_by, updated_by)
    values (${versionId}, ${SUMMARY}, ${status}, ${recipients.length}, ${status === 'sent' ? sql`now()` : null},
      now() - make_interval(secs => ${startedSecondsAgo}), ${E.id}, ${E.id})
    returning id`;
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

const mailingsOf = (versionId: string) =>
  sql`select id, status::text as status, summary, recipient_count, finished_at, created_by
      from document_mailings where document_version_id = ${versionId} and deleted_at is null`;

const recipientsOf = async (mailingId: string) =>
  (
    await sql`select user_id, sent_at from document_mailing_recipients where mailing_id = ${mailingId}`
  ).map((row) => ({ userId: row.user_id as string, sentAt: row.sent_at as Date | null }));

describe('readDocumentMailing', () => {
  it('answers the current published version, not emailed, with how many accounts a mailing would reach and in how many days', async () => {
    const overview = await readDocumentMailing(asUser(E), 'privacy');

    expect(overview).toMatchObject({ versionNumber: 2, current: null, inProgress: null });
    expect(overview.days).toBe(mailingDays(overview.accountCount));
  });

  it('counts a live, verified account, and no unverified, deleted or .invalid one', async () => {
    const before = (await readDocumentMailing(asUser(E), 'privacy')).accountCount;

    await accounts(1, { email_verified: false });
    await accounts(1, { deleted: true });
    await accounts(1, { domain: 'provider.invalid' });
    expect((await readDocumentMailing(asUser(E), 'privacy')).accountCount).toBe(before);

    await accounts(1);
    expect((await readDocumentMailing(asUser(E), 'privacy')).accountCount).toBe(before + 1);
  });

  it('answers a mailing of the current version as sending, with how many it has reached', async () => {
    await mailing(privacyV2, await accounts(3), { sent: 1 });

    expect((await readDocumentMailing(asUser(E), 'privacy')).current).toMatchObject({
      versionNumber: 2,
      state: 'sending',
      reached: 1,
      recipientCount: 3,
      startedAt: expect.any(Date),
      finishedAt: null,
    });
  });

  it('answers a sending mailing that has sent the daily cap today as waiting for tomorrow', async () => {
    await mailing(privacyV2, await accounts(MAILING_DAILY_CAP + 1), { sent: MAILING_DAILY_CAP });

    expect((await readDocumentMailing(asUser(E), 'privacy')).current).toMatchObject({
      state: 'waiting',
      reached: MAILING_DAILY_CAP,
    });
  });

  it('answers the same mailing as sending when those sends were yesterday', async () => {
    await mailing(privacyV2, await accounts(MAILING_DAILY_CAP + 1), {
      sent: MAILING_DAILY_CAP,
      sentAt: 'yesterday',
    });

    expect((await readDocumentMailing(asUser(E), 'privacy')).current?.state).toBe('sending');
  });

  it('answers a sending mailing behind an older mailing of another document as queued', async () => {
    await mailing(termsV1, await accounts(2), { startedSecondsAgo: 3600 });
    await mailing(privacyV2, await accounts(2));

    expect((await readDocumentMailing(asUser(E), 'privacy')).current?.state).toBe('queued');
    expect((await readDocumentMailing(asUser(E), 'terms')).current?.state).toBe('sending');
  });

  it('answers a paused mailing as paused', async () => {
    await mailing(privacyV2, await accounts(3), { status: 'paused', sent: 2 });

    expect((await readDocumentMailing(asUser(E), 'privacy')).current).toMatchObject({
      state: 'paused',
      reached: 2,
      finishedAt: null,
    });
  });

  it('answers a finished mailing as sent, with when it finished', async () => {
    await mailing(privacyV2, await accounts(2), { status: 'sent', sent: 2 });

    expect((await readDocumentMailing(asUser(E), 'privacy')).current).toMatchObject({
      state: 'sent',
      reached: 2,
      recipientCount: 2,
      finishedAt: expect.any(Date),
    });
  });

  it('answers a mailing of an earlier version still sending as the one a new mailing would replace', async () => {
    await mailing(privacyV1, await accounts(3), { sent: 2 });

    const overview = await readDocumentMailing(asUser(E), 'privacy');

    expect(overview.current).toBeNull();
    expect(overview.inProgress).toMatchObject({ versionNumber: 1, state: 'sending', reached: 2 });
  });

  it('throws NotFound for a document with no row', async () => {
    await expect(readDocumentMailing(asUser(E), 'disclaimer')).rejects.toBeInstanceOf(NotFound);
  });
});

describe('emailDocumentToEveryAccount', () => {
  it('writes a sending mailing of the published version to every account it counts, and starts its run', async () => {
    const [unverified] = await accounts(1, { email_verified: false });
    const [deleted] = await accounts(1, { deleted: true });
    const [invalid] = await accounts(1, { domain: 'provider.invalid' });
    const [reader] = await accounts(1);
    const { accountCount } = await readDocumentMailing(asUser(E), 'privacy');

    const overview = await emailDocumentToEveryAccount(
      asUser(E),
      privacyId,
      { summary: SUMMARY },
      notifier,
    );

    // The published version 2, not the open draft 3.
    const [row] = await mailingsOf(privacyV2);
    expect(row).toMatchObject({
      status: 'sending',
      summary: SUMMARY,
      recipient_count: accountCount,
      finished_at: null,
      created_by: E.id,
    });
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
    expect(overview.current).toMatchObject({ versionNumber: 2, state: 'sending', reached: 0 });
  });

  it('marks the document’s sending and paused mailings of earlier versions replaced, and leaves another document’s alone', async () => {
    const sendingV1 = await mailing(privacyV1, await accounts(2), { sent: 1 });
    const termsMailing = await mailing(termsV1, await accounts(2));
    // A paused mailing of the same version 1 cannot sit beside a sending one, so it is checked on its own below.

    await emailDocumentToEveryAccount(asUser(E), privacyId, { summary: SUMMARY }, notifier);

    expect((await mailingsOf(privacyV1))[0]).toMatchObject({
      id: sendingV1,
      status: 'replaced',
      finished_at: null,
    });
    expect((await mailingsOf(termsV1))[0]).toMatchObject({ id: termsMailing, status: 'sending' });
  });

  it('marks a paused mailing of an earlier version replaced', async () => {
    const pausedV1 = await mailing(privacyV1, await accounts(2), { status: 'paused', sent: 1 });

    await emailDocumentToEveryAccount(asUser(E), privacyId, { summary: SUMMARY }, notifier);

    expect((await mailingsOf(privacyV1))[0]).toMatchObject({ id: pausedV1, status: 'replaced' });
  });

  it('refuses a second mailing of a version already mailed, writing nothing and starting nothing', async () => {
    const first = await mailing(privacyV2, await accounts(2), { status: 'sent', sent: 2 });

    const refusal = await emailDocumentToEveryAccount(
      asUser(E),
      privacyId,
      { summary: SUMMARY },
      notifier,
    ).then(
      () => null,
      (error: unknown) => error,
    );

    expect(refusal).toBeInstanceOf(ValidationError);
    expect((await mailingsOf(privacyV2)).map((row) => row.id)).toEqual([first]);
    expect(startJob).not.toHaveBeenCalled();
  });

  it('refuses a blank summary on the summary field', async () => {
    const refusal = await emailDocumentToEveryAccount(
      asUser(E),
      privacyId,
      { summary: '   ' },
      notifier,
    ).then(
      () => null,
      (error: unknown) => error,
    );

    expect(refusal).toBeInstanceOf(ValidationError);
    expect((refusal as ValidationError).issues.map((issue) => issue.path)).toEqual([['summary']]);
    expect(await mailingsOf(privacyV2)).toEqual([]);
    expect(startJob).not.toHaveBeenCalled();
  });

  it('throws NotFound for a document with no published version, and for an id with no document', async () => {
    const draftOnly = await insertDocument(sql, { key: 'disclaimer' }, E.id);
    await insertDocumentVersion(sql, draftOnly, { number: 1, status: 'draft' }, E.id);

    await expect(
      emailDocumentToEveryAccount(asUser(E), draftOnly, { summary: SUMMARY }, notifier),
    ).rejects.toBeInstanceOf(NotFound);
    await expect(
      emailDocumentToEveryAccount(
        asUser(E),
        '00000000-0000-4000-8000-000000000000',
        { summary: SUMMARY },
        notifier,
      ),
    ).rejects.toBeInstanceOf(NotFound);
    expect(startJob).not.toHaveBeenCalled();
  });
});

describe('resumeDocumentMailing', () => {
  it('sets a paused mailing sending again and starts its run, leaving what it has sent', async () => {
    const paused = await mailing(privacyV2, await accounts(3), { status: 'paused', sent: 2 });

    const overview = await resumeDocumentMailing(asUser(E), paused, notifier);

    expect((await mailingsOf(privacyV2))[0]).toMatchObject({
      status: 'sending',
      finished_at: null,
    });
    expect((await recipientsOf(paused)).filter((recipient) => recipient.sentAt)).toHaveLength(2);
    expect(startJob).toHaveBeenCalledExactlyOnceWith(documentMailing, [paused, ORIGIN]);
    expect(overview.current?.state).toBe('sending');
  });

  it.each([['sending'], ['sent'], ['replaced']] as const)(
    'refuses a %s mailing, changing nothing and starting nothing',
    async (status) => {
      const id = await mailing(privacyV2, await accounts(2), { status });

      await expect(resumeDocumentMailing(asUser(E), id, notifier)).rejects.toBeInstanceOf(
        ValidationError,
      );
      expect((await mailingsOf(privacyV2))[0]?.status).toBe(status);
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
    await mailing(privacyV1, await accounts(1), { status: 'paused', startedSecondsAgo: 7200 });
    const oldest = await mailing(termsV1, await accounts(1), { startedSecondsAgo: 3600 });
    await mailing(privacyV2, await accounts(1));

    await startDailyDocumentMailing(ORIGIN);

    expect(startJob).toHaveBeenCalledExactlyOnceWith(documentMailing, [oldest, ORIGIN]);
  });

  it('starts nothing while a run still holds the oldest sending mailing’s hook token', async () => {
    const oldest = await mailing(termsV1, await accounts(1), { startedSecondsAgo: 3600 });
    // A run of the oldest mailing is asleep between batches, across midnight, holding its token.
    jobTokenActive.mockImplementation(async (token) => token === documentMailingHookToken(oldest));

    await startDailyDocumentMailing(ORIGIN);

    // Precondition: the start looked the token up, so the refusal is the lookup’s.
    expect(jobTokenActive).toHaveBeenCalledWith(documentMailingHookToken(oldest));
    expect(startJob).not.toHaveBeenCalled();
  });

  it('starts nothing when no mailing is sending', async () => {
    await mailing(privacyV2, await accounts(1), { status: 'sent', sent: 1 });
    await mailing(privacyV1, await accounts(1), { status: 'paused' });

    await startDailyDocumentMailing(ORIGIN);

    expect(startJob).not.toHaveBeenCalled();
  });
});

// Each call is made by direct id, as a forged request would make it. E's same call succeeds, A owns a coven and holds no site
// role, B is a member, and F passes assertCurator, so each refusal is the admin check's.
describe('the mailing services are an admin’s alone', () => {
  let pausedId: string;
  beforeEach(async () => {
    pausedId = await mailing(privacyV1, await accounts(2), { status: 'paused' });
  });

  const CALLS: [string, (session: Session) => Promise<unknown>][] = [
    ['readDocumentMailing', (session) => readDocumentMailing(session, 'privacy')],
    [
      'emailDocumentToEveryAccount',
      (session) => emailDocumentToEveryAccount(session, privacyId, { summary: SUMMARY }, notifier),
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
