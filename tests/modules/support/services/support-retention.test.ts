import { beforeEach, describe, expect, it, vi } from 'vitest';
import type postgres from 'postgres';
import type { PageRequest } from '@/lib/types';
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
  startSupportRetentionSweep,
} from '@/modules/support';
import type { SupportNotifier } from '@/modules/support';
import { supportRequestLifecycle } from '@/modules/support/jobs/support-lifecycle';
import { supportRetentionSweep } from '@/modules/support/jobs/support-retention-sweep';
import { C, D, E, F, asUser } from '../../../support/as-user';
import { useTestDatabase } from '../../../support/db/database';

// What the resolve services start, and how every reader treats a resolved request whose seven days have passed before its job
// has closed it: as closed, as of its seventh day. The job's runs themselves are tests/workflows/support-lifecycle.test.ts.

const { startJob } = vi.hoisted(() => ({
  startJob: vi.fn(async (..._args: unknown[]) => 'run-id'),
}));
vi.mock('@/lib/jobs', () => ({ startJob }));

let sql: postgres.Sql;
useTestDatabase((client) => {
  sql = client;
});

beforeEach(async () => {
  startJob.mockClear();
  startJob.mockImplementation(async () => 'run-id');
  await sql`truncate support_replies, support_timeouts, support_requests cascade`;
});

const ORIGIN = 'http://localhost:3000';
const PAGE: PageRequest = { limit: 101, inverted: false };
const INPUT = { about: 'bug', subject: 'The Testwort jar sticks', message: 'It sticks.' } as const;
const mail: SupportNotifier = {
  received: async () => undefined,
  resolved: async () => undefined,
  origin: async () => ORIGIN,
};
const DAY_MS = 24 * 60 * 60 * 1000;

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

describe('the run each resolve starts', () => {
  it('a staff resolve starts the request’s lifecycle run with its id and the origin, and nothing of the sender’s', async () => {
    const request = await send();
    await resolveSupportRequest(asUser(E), request.id, mail);
    expect(startJob).toHaveBeenCalledWith(supportRequestLifecycle, [request.id, ORIGIN]);
  });

  it('the sender’s own resolve starts it too', async () => {
    const request = await send();
    await resolveMySupportRequest(asUser(C), request.id, mail);
    expect(startJob).toHaveBeenCalledWith(supportRequestLifecycle, [request.id, ORIGIN]);
  });

  it('a staff close starts it with no origin, for the anonymising alone', async () => {
    const request = await send();
    await closeSupportRequest(asUser(E), request.id);
    expect(startJob).toHaveBeenCalledWith(supportRequestLifecycle, [request.id, null]);
  });

  it('a start that fails leaves the resolve standing', async () => {
    const errors = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    startJob.mockRejectedValueOnce(new Error('queue down'));
    const request = await send();
    expect((await resolveSupportRequest(asUser(E), request.id, mail)).status).toBe('resolved');
    expect(await statusOf(request.id)).toBe('resolved');
    expect(errors).toHaveBeenCalled();
    errors.mockRestore();
  });

  it('a refused resolve starts nothing', async () => {
    const request = await send();
    await closeSupportRequest(asUser(E), request.id);
    startJob.mockClear();
    await expect(resolveSupportRequest(asUser(E), request.id, mail)).rejects.toThrow();
    await expect(resolveMySupportRequest(asUser(C), request.id, mail)).rejects.toThrow();
    expect(startJob).not.toHaveBeenCalled();
  });
});

describe('the sweep an admin’s visit starts', () => {
  it('an admin starts one sweep; a curator and a member start none', async () => {
    await startSupportRetentionSweep(asUser(E));
    expect(startJob).toHaveBeenCalledWith(supportRetentionSweep, []);
    startJob.mockClear();
    await startSupportRetentionSweep(asUser(F));
    await startSupportRetentionSweep(asUser(D));
    expect(startJob).not.toHaveBeenCalled();
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
