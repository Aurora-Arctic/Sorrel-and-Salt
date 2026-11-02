import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type postgres from 'postgres';
import type { PageRequest } from '@/lib/types';
import { assertRunArguments } from '@/lib/jobs/run-arguments';
import { SIGNED_OUT_SENDER_ID } from '@/lib/support-sender';
import { SYSTEM_ACTOR_ID } from '@/lib/system-actor';
import {
  closeSupportRequest,
  countSupportViews,
  getMySupportFollowUpId,
  getMySupportRequest,
  getSupportRequest,
  listSupportRequests,
  replyToSupportRequest,
  resolveMySupportRequest,
  resolveSupportRequest,
  sendSenderMessage,
  sendSupportRequest,
  startSupportRetention,
} from '@/modules/support';
import type { SupportNotifier } from '@/modules/support';
import { supportRetention } from '@/modules/support/jobs/support-retention';
import {
  RETENTION_PAGE_SIZE,
  RETENTION_STAGES,
} from '@/modules/support/jobs/support-retention-pages';
import { retentionDueStep as findRetentionDue } from '@/modules/support/jobs/support-retention-steps';
import { retentionBatchStep as runRetentionBatch } from '@/modules/support/jobs/support-retention-batch-steps';
import { C, E, asUser } from '../../../support/as-user';
import { useTestDatabase } from '../../../support/db/database';

// What starts the daily support-retention job, what its stage reads and its batches do, called as its steps call them; and how
// every reader treats a resolved request whose seven days have passed before the job has closed it: as closed, as of its seventh
// day. The coordinator and batch runs themselves are tests/workflows/support-retention.test.ts.

const { startJob } = vi.hoisted(() => ({
  startJob: vi.fn(async (..._args: unknown[]) => 'run-id'),
}));
vi.mock('@/lib/jobs', () => ({ startJob }));

// A page of three rather than 500, so the paging test crosses a page boundary in every stage with a few rows rather than 1,503:
// what it proves is the cursor and the hand-off between pages, which the page's size does not change.
vi.mock('@/modules/support/jobs/support-retention-pages', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/modules/support/jobs/support-retention-pages')>()),
  RETENTION_PAGE_SIZE: 3,
}));

// The closing-soon notice goes through the transport itself; this stands in for it, and can be told to refuse a message.
const { delivered, refuse, MailNotSent } = vi.hoisted(() => {
  class MailNotSent extends Error {}
  return {
    delivered: [] as { to: string; subject: string; text: string }[],
    refuse: { to: null as string | null },
    MailNotSent,
  };
});
vi.mock('@/lib/mail-transport', () => ({
  MailNotSent,
  deliver: async (message: { to: string; subject: string; text: string }) => {
    if (message.to === refuse.to) throw new MailNotSent('refused');
    delivered.push(message);
    return true;
  },
}));

let sql: postgres.Sql;
useTestDatabase((client) => {
  sql = client;
});

beforeAll(() => {
  // No transport, so a status mail is tried in place rather than started as a run, and every run started is the one asserted.
  vi.stubEnv('MAIL_TRANSPORT', '');
});

afterAll(() => {
  vi.unstubAllEnvs();
});

beforeEach(async () => {
  startJob.mockClear();
  startJob.mockImplementation(async () => 'run-id');
  delivered.length = 0;
  refuse.to = null;
  await sql`truncate support_replies, support_timeouts, support_requests cascade`;
});

const ORIGIN = 'http://localhost:3000';
const PAGE: PageRequest = { limit: 101, inverted: false };
const INPUT = { about: 'bug', subject: 'The Testwort jar sticks', message: 'It sticks.' } as const;
const mail: SupportNotifier = {
  origin: async () => ORIGIN,
};
const DAY_MS = 24 * 60 * 60 * 1000;
type RetentionStage = Parameters<typeof findRetentionDue>[0];

const send = () => sendSupportRequest(asUser(C), INPUT, mail);
/** A request C sent, resolved by staff `daysAgo` days ago. */
async function resolved(daysAgo: number) {
  const request = await send();
  await resolveSupportRequest(asUser(E), request.id, mail);
  await sql`update support_requests set resolved_at = now() - make_interval(days => ${daysAgo}) where id = ${request.id}`;
  const [{ resolved_at }] =
    await sql`select resolved_at from support_requests where id = ${request.id}`;
  return { id: request.id, resolvedAt: resolved_at as Date };
}
const statusOf = async (id: string) =>
  (await sql`select status from support_requests where id = ${id}`)[0]!.status as string;
const rowOf = async (id: string) =>
  (await sql`select * from support_requests where id = ${id}`)[0]!;

/** `count` requests from C, resolved `daysAgo` days ago, inserted in one statement; their ids. */
async function resolvedRows(count: number, daysAgo: number): Promise<string[]> {
  const rows = await sql`
    insert into support_requests (about, subject, message, path, status, resolved_by, resolved_at, created_by, updated_by)
    select 'bug', 'The Testwort jar sticks', 'It will not open.', '/compendium', 'resolved', ${E.id},
      now() - make_interval(days => ${daysAgo}), ${C.id}, ${C.id}
    from generate_series(1, ${count})
    returning id
  `;
  return rows.map((row) => row.id as string);
}

/** `count` requests from C, closed `monthsAgo` months ago, inserted in one statement; their ids. */
async function closedRows(count: number, monthsAgo: number): Promise<string[]> {
  const rows = await sql`
    insert into support_requests
      (about, subject, message, path, status, resolved_by, resolved_at, closed_at, created_by, updated_by)
    select 'bug', 'The Testwort jar sticks', 'It will not open.', '/compendium', 'closed', ${E.id},
      now() - make_interval(months => ${monthsAgo}, days => 7), now() - make_interval(months => ${monthsAgo}),
      ${C.id}, ${C.id}
    from generate_series(1, ${count})
    returning id
  `;
  return rows.map((row) => row.id as string);
}

/** Every page due for `stage` as of `now`, read as the coordinator reads them. */
async function allPages(stage: RetentionStage, now: number): Promise<string[][]> {
  const pages: string[][] = [];
  let after: string | null = null;
  for (;;) {
    const ids: string[] = await findRetentionDue(stage, now, after);
    if (ids.length === 0) return pages;
    pages.push(ids);
    if (ids.length < RETENTION_PAGE_SIZE) return pages;
    after = ids[ids.length - 1]!;
  }
}

/** One day's work as of `now`, done as the coordinator and its batches do it, one after another; how many each stage changed. */
async function runDay(now: number = Date.now()): Promise<Record<RetentionStage, number>> {
  const changed: Record<RetentionStage, number> = { notice: 0, close: 0, anonymise: 0 };
  for (const kind of RETENTION_STAGES) {
    for (const ids of await allPages(kind, now)) {
      changed[kind] += await runRetentionBatch({ kind, ids, now, origin: ORIGIN });
    }
  }
  return changed;
}

describe('what starts the daily job', () => {
  it('starts one coordinator run with the time and the origin, which the run-argument allow-list passes', async () => {
    const now = new Date('2026-11-02T03:00:00Z');
    await startSupportRetention(ORIGIN, now);
    expect(startJob).toHaveBeenCalledExactlyOnceWith(supportRetention, [now.getTime(), ORIGIN]);
    expect(() => assertRunArguments([now.getTime(), ORIGIN])).not.toThrow();
  });

  it('a batch’s arguments are ids, a kind, a number and the origin, which the allow-list passes', async () => {
    const ids = await resolvedRows(2, 6);
    expect(() =>
      assertRunArguments([{ kind: 'notice', ids, now: Date.now(), origin: ORIGIN }]),
    ).not.toThrow();
  });
});

describe('a resolve or a close', () => {
  it('starts no run: neither a staff resolve, the sender’s own resolve nor a staff close', async () => {
    const byStaff = await send();
    const bySender = await send();
    const closed = await send();
    // The precondition: a start of the job reaches the stand-in, so one made by a resolve or close would be seen.
    await startSupportRetention(ORIGIN);
    expect(startJob).toHaveBeenCalledOnce();
    startJob.mockClear();

    expect((await resolveSupportRequest(asUser(E), byStaff.id, mail)).status).toBe('resolved');
    expect((await resolveMySupportRequest(asUser(C), bySender.id)).status).toBe('resolved');
    expect((await closeSupportRequest(asUser(E), closed.id)).status).toBe('closed');

    expect(startJob).not.toHaveBeenCalled();
  });
});

describe('one day’s run', () => {
  it('reads as due for each stage only the requests that stage takes', async () => {
    const [noticeDue] = await resolvedRows(1, 6);
    await resolvedRows(1, 3);
    const [lapsed] = await resolvedRows(1, 8);
    const [old] = await closedRows(1, 13);
    await closedRows(1, 11);
    const now = Date.now();

    expect(await findRetentionDue('notice', now, null)).toEqual([noticeDue]);
    expect(await findRetentionDue('close', now, null)).toEqual([lapsed]);
    expect(await findRetentionDue('anonymise', now, null)).toEqual([old]);
  });

  it('sends the notice due, closes what lapsed and anonymises what is due, and leaves the rest', async () => {
    const [noticeDue] = await resolvedRows(1, 6);
    const [tooEarly] = await resolvedRows(1, 3);
    const [lapsed] = await resolvedRows(1, 8);
    const [old] = await closedRows(1, 13);
    const [recent] = await closedRows(1, 11);
    const lapsedAt = (await rowOf(lapsed!)).resolved_at as Date;

    expect(await runDay()).toEqual({ notice: 1, close: 1, anonymise: 1 });

    // The notice: sent to the sender and stamped, the request still resolved.
    expect(delivered.map((message) => message.to)).toEqual([C.email]);
    expect(delivered[0]!.text).toContain(`/account/support?request=${noticeDue}`);
    expect(await rowOf(noticeDue!)).toMatchObject({ status: 'resolved' });
    expect((await rowOf(noticeDue!)).closing_notice_sent_at).toBeInstanceOf(Date);
    // Before day 5: nothing.
    expect(await rowOf(tooEarly!)).toMatchObject({
      status: 'resolved',
      closing_notice_sent_at: null,
    });
    // Past day 7: closed as of its seventh day, with no notice, since it has already lapsed.
    const closed = await rowOf(lapsed!);
    expect(closed.status).toBe('closed');
    expect((closed.closed_at as Date).getTime()).toBe(lapsedAt.getTime() + 7 * DAY_MS);
    expect(closed.closing_notice_sent_at).toBeNull();
    // Closed thirteen months ago: anonymised; eleven months ago: kept.
    expect(await rowOf(old!)).toMatchObject({
      subject: 'Anonymised support request.',
      message: '',
      created_by: SYSTEM_ACTOR_ID,
    });
    expect(await rowOf(recent!)).toMatchObject({
      subject: 'The Testwort jar sticks',
      created_by: C.id,
    });
  });

  it('does nothing on a second run the same day', async () => {
    const [noticeDue] = await resolvedRows(1, 6);
    const [lapsed] = await resolvedRows(1, 8);
    const [old] = await closedRows(1, 13);
    // The precondition: the first run had work in each stage.
    expect(await runDay()).toEqual({ notice: 1, close: 1, anonymise: 1 });
    const after = await Promise.all([noticeDue!, lapsed!, old!].map(rowOf));

    expect(await runDay()).toEqual({ notice: 0, close: 0, anonymise: 0 });
    expect(delivered).toHaveLength(1);
    expect(await Promise.all([noticeDue!, lapsed!, old!].map(rowOf))).toEqual(after);
  });

  it('a batch run twice, or given ids that are not due, changes nothing', async () => {
    const [noticeDue] = await resolvedRows(1, 6);
    const [tooEarly] = await resolvedRows(1, 3);
    const [lapsed] = await resolvedRows(1, 8);
    const [old] = await closedRows(1, 13);
    const [recent] = await closedRows(1, 11);
    const now = Date.now();
    const batch = (kind: RetentionStage, ids: string[]) =>
      runRetentionBatch({ kind, ids, now, origin: ORIGIN });
    // The precondition: each batch changes its due request the first time.
    expect(await batch('notice', [noticeDue!, tooEarly!])).toBe(1);
    expect(await batch('close', [lapsed!, tooEarly!])).toBe(1);
    expect(await batch('anonymise', [old!, recent!])).toBe(1);
    const before = await Promise.all([noticeDue!, tooEarly!, lapsed!, old!, recent!].map(rowOf));

    expect(await batch('notice', [noticeDue!, tooEarly!])).toBe(0);
    expect(await batch('close', [lapsed!, tooEarly!])).toBe(0);
    expect(await batch('anonymise', [old!, recent!])).toBe(0);
    expect(delivered).toHaveLength(1);
    expect(await Promise.all([noticeDue!, tooEarly!, lapsed!, old!, recent!].map(rowOf))).toEqual(
      before,
    );
  });

  it('a close batch leaves a request reopened and resolved again since its page was read', async () => {
    const [lapsed] = await resolvedRows(1, 8);
    const now = Date.now();
    const page = await findRetentionDue('close', now, null);
    // The precondition: the request was due when the page was read.
    expect(page).toEqual([lapsed]);
    await sql`update support_requests set resolved_at = now() - interval '1 day' where id = ${lapsed!}`;

    expect(await runRetentionBatch({ kind: 'close', ids: page, now, origin: ORIGIN })).toBe(0);
    expect(await statusOf(lapsed!)).toBe('resolved');
  });

  it('reads the ids due a page of RETENTION_PAGE_SIZE at a time, in id order, each id once', async () => {
    const noticeDue = await resolvedRows(RETENTION_PAGE_SIZE + 1, 6);
    const lapsed = await resolvedRows(RETENTION_PAGE_SIZE + 1, 8);
    const old = await closedRows(RETENTION_PAGE_SIZE + 1, 13);
    const now = Date.now();

    for (const [stage, due] of [
      ['notice', noticeDue],
      ['close', lapsed],
      ['anonymise', old],
    ] as const) {
      const pages = await allPages(stage, now);
      expect(pages.map((page) => page.length)).toEqual([RETENTION_PAGE_SIZE, 1]);
      expect(pages.flat()).toEqual([...due].sort());
    }

    expect(await runDay(now)).toEqual({
      notice: RETENTION_PAGE_SIZE + 1,
      close: RETENTION_PAGE_SIZE + 1,
      anonymise: RETENTION_PAGE_SIZE + 1,
    });
  });

  it('a notice batch sends the others when one is refused, then throws, and its retry sends only that one', async () => {
    const [refused] = await resolvedRows(1, 6);
    const [signedOut] = await sql`
      insert into support_requests
        (about, subject, message, path, status, resolved_by, resolved_at, sender_email, created_by, updated_by)
      values ('question', 'Testwort?', 'Where is it?', '/support', 'resolved', ${E.id}, now() - interval '6 days',
        'signed-out@retention.test', ${SIGNED_OUT_SENDER_ID}, ${SIGNED_OUT_SENDER_ID})
      returning id
    `;
    const batch = {
      kind: 'notice' as const,
      ids: [refused!, signedOut!.id as string],
      now: Date.now(),
      origin: ORIGIN,
    };
    refuse.to = C.email;

    await expect(runRetentionBatch(batch)).rejects.toBeInstanceOf(MailNotSent);
    expect(delivered.map((message) => message.to)).toEqual(['signed-out@retention.test']);
    expect((await rowOf(signedOut!.id as string)).closing_notice_sent_at).toBeInstanceOf(Date);
    expect((await rowOf(refused!)).closing_notice_sent_at).toBeNull();

    refuse.to = null;
    expect(await runRetentionBatch(batch)).toBe(1);
    expect(delivered.map((message) => message.to)).toEqual(['signed-out@retention.test', C.email]);
    expect((await rowOf(refused!)).closing_notice_sent_at).toBeInstanceOf(Date);
  });
});

describe('a resolved request past its seventh day, before its job runs', () => {
  it('reads as closed, as of the seventh day, to its sender and to staff', async () => {
    const lapsed = await resolved(8);
    expect(await statusOf(lapsed.id)).toBe('resolved');
    const closedAt = new Date(lapsed.resolvedAt.getTime() + 7 * DAY_MS);

    expect(await getMySupportRequest(asUser(C), lapsed.id)).toMatchObject({
      status: 'closed',
      closedAt,
    });
    expect(await getSupportRequest(asUser(E), lapsed.id)).toMatchObject({
      status: 'closed',
      closedAt,
    });
    const [entry] = await listSupportRequests(asUser(E), {}, PAGE);
    expect(entry!.node).toMatchObject({ id: lapsed.id, status: 'closed' });
  });

  it('is counted and filtered as closed, and one inside its seven days as resolved', async () => {
    const lapsed = await resolved(8);
    const recent = await resolved(6);
    const ids = async (status: 'resolved' | 'closed') =>
      (await listSupportRequests(asUser(E), { status }, PAGE)).map((entry) => entry.node.id);

    expect(await ids('closed')).toEqual([lapsed.id]);
    expect(await ids('resolved')).toEqual([recent.id]);
    expect(await countSupportViews(asUser(E), {})).toMatchObject({ resolved: 1, closed: 1 });
  });

  it('takes no staff move: a reply cannot set it waiting, and a resolve or close is refused', async () => {
    const lapsed = await resolved(8);
    await expect(closeSupportRequest(asUser(E), lapsed.id)).rejects.toThrow(/closed/);
    await expect(
      replyToSupportRequest(asUser(E), lapsed.id, 'Still there?', mail, { waitingOnSender: true }),
    ).rejects.toThrow();
    expect(await statusOf(lapsed.id)).toBe('resolved');
  });

  it('a sender’s message opens a new request linked to it, as on a closed one', async () => {
    const lapsed = await resolved(8);
    const follow = await sendSenderMessage(asUser(C), lapsed.id, 'It is back.');
    expect(follow.id).not.toBe(lapsed.id);
    expect(follow.linkedFrom).toBe(lapsed.id);
    expect(await getMySupportFollowUpId(asUser(C), lapsed.id)).toBe(follow.id);
    expect(await statusOf(lapsed.id)).toBe('resolved');
  });

  it('the preconditions: inside its seven days the same message reopens the request itself', async () => {
    const recent = await resolved(6);
    await sql`update support_requests set closing_notice_sent_at = now() where id = ${recent.id}`;
    const moved = await sendSenderMessage(asUser(C), recent.id, 'It is back.');
    expect(moved.id).toBe(recent.id);
    expect(moved.status).toBe('open');
    // The reopen clears the notice, so the next resolution sends its own.
    const [row] =
      await sql`select closing_notice_sent_at from support_requests where id = ${recent.id}`;
    expect(row!.closing_notice_sent_at).toBeNull();
  });
});
