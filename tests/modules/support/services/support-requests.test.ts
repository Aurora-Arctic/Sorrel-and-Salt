import { beforeEach, describe, expect, it, vi } from 'vitest';
import type postgres from 'postgres';
import { Forbidden, NotFound, ValidationError } from '@/lib/errors';
import { SIGNED_OUT_SENDER_ID } from '@/lib/support-sender';
import { SYSTEM_ACTOR_ID } from '@/lib/system-actor';
import type { Cursor, PageEntry, PageRequest } from '@/lib/types';
import {
  assignSupportRequest,
  closeSupportRequest,
  countSupportRequests,
  getMySupportRequest,
  countMySupportRequestsByStatus,
  getMySupportTimeout,
  getSupportRequest,
  liftSupportTimeout,
  listMySupportRequests,
  listSupportRequests,
  repliesForRequests,
  replyToSupportRequest,
  resolveSupportRequest,
  sendSignedOutSupportRequest,
  sendSupportRequest,
  setSupportRequestCuratorVisible,
  setSupportRequestIssueUrl,
  timeOutSupportSender,
  timeoutsForSenders,
  standingTimeoutsOf,
  usersNamedOnRequests,
} from '@/modules/support';
import type { SupportNotifier } from '@/modules/support';
import { supportReplyNotice } from '@/modules/support/jobs/support-reply-notice';
import { A, B, C, D, E, F, asUser } from '../../../support/as-user';
import { failureOf, useTestDatabase } from '../../../support/db/database';
import type { SessionUser } from '../../../support/types';
import { makeWorkspace, workspaceColumns } from '../../../support/fixtures';
import { noPauseNotifier, PAUSE_MESSAGE } from '../../../support/email-verification';

// The support services by direct call: who may send, read, answer and manage a request, each refusal paired with the
// same call succeeding once its precondition holds (claude-docs/design-decisions/m15.1-support-form.md).

// A reply's notice goes out through its job, whose mail is tested in tests/workflows/support-reply-notice.test.ts.
const { startJob } = vi.hoisted(() => ({
  startJob: vi.fn(async (..._args: unknown[]) => 'run-id'),
}));
vi.mock('@/lib/jobs', () => ({ startJob }));
const replyNotices = () =>
  startJob.mock.calls.filter(([job]) => job === supportReplyNotice).map(([, args]) => args);

let sql: postgres.Sql;
useTestDatabase((client) => {
  sql = client;
});

beforeEach(async () => {
  startJob.mockClear();
  await sql`truncate support_replies, support_timeouts, support_requests cascade`;
});

const PAGE: PageRequest = { limit: 101, inverted: false };
const FUTURE = () => new Date(Date.now() + 3_600_000);
const INPUT = { about: 'bug', subject: 'The jar will not open', message: 'It sticks.' } as const;

function notifier(): SupportNotifier {
  return {
    origin: async () => 'http://localhost:3000',
  };
}

const send = (user: SessionUser = C, input: Parameters<typeof sendSupportRequest>[1] = INPUT) =>
  sendSupportRequest(asUser(user), input, notifier());

const mail: SupportNotifier = {
  origin: async () => 'http://localhost:3000',
};

describe('sendSupportRequest', () => {
  it('lets a viewer and an account in no coven send', async () => {
    const [coven] =
      await sql`insert into workspaces ${sql({ ...workspaceColumns(makeWorkspace({ name: `Testwort Coven ${Math.random().toString(36).slice(2)}` })), created_by: A.id, updated_by: A.id })} returning id`;
    await sql`insert into workspace_members (workspace_id, user_id, role, created_by, updated_by) values (${coven!.id}, ${C.id}, 'viewer', ${A.id}, ${A.id})`;
    expect((await send(C)).createdBy).toBe(C.id);

    const [{ n }] =
      await sql`select count(*)::int as n from workspace_members where user_id = ${E.id}`;
    expect(n).toBe(0);
    expect((await send(E)).createdBy).toBe(E.id);
  });

  it('refuses an unverified account', async () => {
    const unverified = { ...asUser(C), emailUnverified: true as const };
    expect(await failureOf(sendSupportRequest(unverified, INPUT, notifier()))).toBeInstanceOf(
      Forbidden,
    );
    expect(await send(C)).toBeDefined();
  });

  it.each([
    ['an empty subject', { ...INPUT, subject: '  ' }],
    ['a subject of 121 characters', { ...INPUT, subject: 'x'.repeat(121) }],
    ['an empty message', { ...INPUT, message: '' }],
    ['a message of 4,001 characters', { ...INPUT, message: 'x'.repeat(4001) }],
    ['a page that is not on this site', { ...INPUT, path: 'https://example.test/a' }],
    ['a page on another host written with //', { ...INPUT, path: '//example.test/a' }],
  ])('refuses %s', async (_name, input) => {
    expect(await failureOf(send(C, input))).toBeInstanceOf(ValidationError);
  });

  it('accepts the longest subject and message', async () => {
    const row = await send(C, { ...INPUT, subject: 'x'.repeat(120), message: 'x'.repeat(4000) });
    expect(row.subject).toHaveLength(120);
  });

  it('stores the error reference, and none as null', async () => {
    const withRef = await send(C, { ...INPUT, errorCode: 500, errorReference: ' abc123 ' });
    expect(withRef.errorReference).toBe('abc123');
    expect((await send(C)).errorReference).toBeNull();
    await expect(send(C, { ...INPUT, errorReference: 'x'.repeat(101) })).rejects.toThrow();
  });

  it('stores the path as sent, coven slug included, and no path as empty', async () => {
    const withPath = await send(C, {
      ...INPUT,
      path: '/coven/moonlit-hollow/grimoire',
      errorCode: 500,
    });
    expect(withPath.path).toBe('/coven/moonlit-hollow/grimoire');
    expect(withPath.errorCode).toBe(500);
    expect((await send(C)).path).toBe('');
  });

  it('refuses the eleventh request in 24 hours, and counts only the sender’s own', async () => {
    for (let i = 0; i < 10; i += 1) await send(C);
    const refusal = await failureOf(send(C));
    expect(refusal).toBeInstanceOf(Forbidden);
    expect((refusal as Forbidden).message).toMatch(/10 support requests/);
    expect(await send(D)).toBeDefined();
  });

  it('lets only one of two simultaneous sends take the tenth place', async () => {
    // Several senders at once open the pool's other connections, so the two sends below do not queue behind one connection.
    await Promise.all([A, B, D, E].map((user) => send(user)));
    for (let i = 0; i < 9; i += 1) await send(C);
    const results = await Promise.allSettled([send(C), send(C)]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    const refused = results.find((r) => r.status === 'rejected') as PromiseRejectedResult;
    expect(refused.reason).toBeInstanceOf(Forbidden);
    expect((refused.reason as Forbidden).message).toMatch(/10 support requests/);
    const [{ count }] =
      await sql`select count(*)::int as count from support_requests where created_by = ${C.id}`;
    expect(count).toBe(10);
  });

  it('does not count a request older than 24 hours', async () => {
    for (let i = 0; i < 10; i += 1) await send(C);
    await sql`update support_requests set created_at = now() - interval '25 hours' where created_by = ${C.id}`;
    expect(await send(C)).toBeDefined();
  });

  it('refuses a send during a time-out, naming its end, and allows it once lifted', async () => {
    const until = new Date(Date.now() + 7_200_000);
    const timeout = await timeOutSupportSender(
      asUser(E),
      C.id,
      until,
      'Spam',
      noPauseNotifier,
      PAUSE_MESSAGE,
    );
    const refusal = await failureOf(send(C));
    expect(refusal).toBeInstanceOf(Forbidden);
    expect((refusal as Forbidden).message).toContain(
      until.toISOString().slice(0, 16).replace('T', ' '),
    );

    await liftSupportTimeout(asUser(E), timeout.id);
    expect(await send(C)).toBeDefined();
  });

  it('refuses a send during a time-out with no end date, saying so, and allows it once lifted', async () => {
    const timeout = await timeOutSupportSender(
      asUser(E),
      C.id,
      null,
      'Spam',
      noPauseNotifier,
      PAUSE_MESSAGE,
    );
    const refusal = await failureOf(send(C));
    expect(refusal).toBeInstanceOf(Forbidden);
    expect((refusal as Forbidden).message).toContain('timed out with no end date');

    await liftSupportTimeout(asUser(E), timeout.id);
    expect(await send(C)).toBeDefined();
  });
});

describe('mySupportRequests', () => {
  it('pages the sender’s own requests newest first, with replies', async () => {
    const first = await send(C);
    const second = await send(C);
    await send(D);
    await sql`update support_requests set created_at = now() - interval '1 hour' where id = ${first.id}`;
    await replyToSupportRequest(asUser(E), first.id, 'Try again.', notifier());

    const entries = await listMySupportRequests(asUser(C), PAGE);
    expect(entries.map((entry) => entry.node.id)).toEqual([second.id, first.id]);
    const replies = await repliesForRequests(asUser(C), [first.id]);
    expect(replies[0]?.map((reply) => reply.body)).toEqual(['Try again.']);
  });

  it('lists the sender’s still-open requests ahead of their resolved and closed ones, newest first within each', async () => {
    const waiting = await send(C);
    const oldOpen = await send(C);
    const resolved = await send(C);
    const closed = await send(C);
    await sql`update support_requests set created_at = now() - interval '1 hour' where id = ${oldOpen.id}`;
    await sql`update support_requests set created_at = now() - interval '2 hours' where id = ${waiting.id}`;
    await sql`update support_requests set status = 'waiting_on_sender' where id = ${waiting.id}`;
    await sql`update support_requests set status = 'closed', created_at = now() - interval '3 hours' where id = ${closed.id}`;
    await resolveSupportRequest(asUser(E), resolved.id, mail);

    const entries = await listMySupportRequests(asUser(C), PAGE);
    expect(entries.map((entry) => entry.node.id)).toEqual([
      oldOpen.id,
      waiting.id,
      resolved.id,
      closed.id,
    ]);
  });

  it('carries no issue address on the sender’s own reads, though the request has one', async () => {
    const request = await send(C);
    const issue = 'https://github.com/Aurora-Arctic/Sorrel-and-Salt/issues/1394';
    await setSupportRequestIssueUrl(asUser(E), request.id, issue);
    expect((await getSupportRequest(asUser(E), request.id)).issueUrl).toBe(issue);

    await setSupportRequestCuratorVisible(asUser(E), request.id, true);
    expect((await getSupportRequest(asUser(F), request.id)).issueUrl).toBe(issue);

    expect((await getMySupportRequest(asUser(C), request.id)).issueUrl).toBeNull();
    const entries = await listMySupportRequests(asUser(C), PAGE);
    expect(entries.map((entry) => entry.node.issueUrl)).toEqual([null]);
  });

  it('counts the sender’s open and closed requests across all statuses, leaving out another sender’s and a deleted one', async () => {
    const mine = [await send(C), await send(C), await send(C), await send(C), await send(C)];
    const statuses = ['open', 'waiting_on_sender', 'resolved', 'closed', 'open'];
    for (const [index, request] of mine.entries()) {
      await sql`update support_requests set status = ${statuses[index]!} where id = ${request.id}`;
    }
    await sql`update support_requests set deleted_at = now() where id = ${mine[4]!.id}`;
    const other = await send(D);
    expect(other.status).toBe('open');

    expect(await countMySupportRequestsByStatus(asUser(C))).toEqual({ open: 2, closed: 2 });
    expect(await countMySupportRequestsByStatus(asUser(D))).toEqual({ open: 1, closed: 0 });
  });

  it('refuses the status counts to an unverified account', async () => {
    const unverified = { ...asUser(C), emailUnverified: true as const };
    expect(await failureOf(countMySupportRequestsByStatus(unverified))).toBeInstanceOf(Forbidden);
  });

  it('carries no error reference on the sender’s own reads, though the request has one', async () => {
    const request = await send(C);
    await sql`update support_requests set error_code = 500, error_reference = '994764113' where id = ${request.id}`;
    expect((await getSupportRequest(asUser(E), request.id)).errorReference).toBe('994764113');

    expect((await getMySupportRequest(asUser(C), request.id)).errorReference).toBeNull();
    const entries = await listMySupportRequests(asUser(C), PAGE);
    expect(entries.map((entry) => entry.node.errorReference)).toEqual([null]);
  });

  it('refuses another sender’s request by id, which exists and is open', async () => {
    const request = await send(C);
    const [{ status }] = await sql`select status from support_requests where id = ${request.id}`;
    expect(status).toBe('open');

    expect(await failureOf(getMySupportRequest(asUser(D), request.id))).toBeInstanceOf(NotFound);
    expect((await getMySupportRequest(asUser(C), request.id)).id).toBe(request.id);
  });

  it('shows another sender no replies to a request that is not theirs', async () => {
    const request = await send(C);
    await replyToSupportRequest(asUser(E), request.id, 'Hello.', notifier());
    expect((await repliesForRequests(asUser(D), [request.id]))[0]).toEqual([]);
    expect((await repliesForRequests(asUser(C), [request.id]))[0]).toHaveLength(1);
  });
});

describe('supportRequests', () => {
  it('lists open ahead of resolved, newest first within each, for an admin who reads all', async () => {
    const oldOpen = await send(C);
    const resolved = await send(C);
    const newOpen = await send(D);
    await sql`update support_requests set created_at = now() - interval '3 hours' where id = ${oldOpen.id}`;
    await resolveSupportRequest(asUser(E), resolved.id, notifier());

    const entries = await listSupportRequests(asUser(E), {}, PAGE);
    expect(entries.map((entry) => entry.node.id)).toEqual([newOpen.id, oldOpen.id, resolved.id]);
  });

  it('narrows a curator to marked or assigned requests in SQL', async () => {
    const plain = await send(C);
    const marked = await send(C);
    const assigned = await send(D);
    await setSupportRequestCuratorVisible(asUser(E), marked.id, true);
    await assignSupportRequest(asUser(E), assigned.id, F.id);

    const ids = (await listSupportRequests(asUser(F), {}, PAGE)).map((entry) => entry.node.id);
    expect(ids.sort()).toEqual([marked.id, assigned.id].sort());
    expect(ids).not.toContain(plain.id);
  });

  it('shows the coven in a page to an admin and the sender, and hides it from a curator, in a list and by id', async () => {
    const REAL = '/coven/whitethorn-coven/grimoire';
    const request = await send(C, { ...INPUT, path: REAL });
    await setSupportRequestCuratorVisible(asUser(E), request.id, true);
    // The curator can read this request, and the row holds the real page.
    expect((await getSupportRequest(asUser(F), request.id)).id).toBe(request.id);
    const [{ path }] = await sql`select path from support_requests where id = ${request.id}`;
    expect(path).toBe(REAL);

    expect((await getSupportRequest(asUser(E), request.id)).path).toBe(REAL);
    expect((await getSupportRequest(asUser(F), request.id)).path).toBe('/coven/[coven]/grimoire');
    expect((await getMySupportRequest(asUser(C), request.id)).path).toBe(REAL);
    const listed = (user: SessionUser) =>
      listSupportRequests(asUser(user), {}, PAGE).then((entries) => entries[0]?.node.path);
    expect(await listed(E)).toBe(REAL);
    expect(await listed(F)).toBe('/coven/[coven]/grimoire');
  });

  it('gives an admin a signed-out sender’s address and a curator none, in a list and by id', async () => {
    const address = 'visitor@example.test';
    await sql`delete from support_send_counts`;
    await sendSignedOutSupportRequest(
      { about: 'account', email: address, subject: 'No code', message: 'It never comes.' },
      { clientIp: '203.0.113.7', notifier: notifier() },
    );
    const [sent] = await sql`select id from support_requests where sender_email = ${address}`;
    await setSupportRequestCuratorVisible(asUser(E), sent.id, true);
    // The curator can read this request, and the row holds the address.
    expect((await getSupportRequest(asUser(F), sent.id)).id).toBe(sent.id);
    const [{ sender_email: stored }] =
      await sql`select sender_email from support_requests where id = ${sent.id}`;
    expect(stored).toBe(address);

    expect((await getSupportRequest(asUser(E), sent.id)).senderEmail).toBe(address);
    expect((await getSupportRequest(asUser(F), sent.id)).senderEmail).toBeNull();
    const listed = (user: SessionUser) =>
      listSupportRequests(asUser(user), {}, PAGE).then((entries) => entries[0]?.node.senderEmail);
    expect(await listed(E)).toBe(address);
    expect(await listed(F)).toBeNull();
  });

  it('names an account sender to an admin with the address and to a curator without it', async () => {
    const request = await send(C);
    await setSupportRequestCuratorVisible(asUser(E), request.id, true);
    // The curator can read this request, and the account holds an address.
    expect((await getSupportRequest(asUser(F), request.id)).id).toBe(request.id);
    const [{ email }] = await sql`select email from users where id = ${C.id}`;
    expect(email).toBeTruthy();

    const [forAdmin] = await usersNamedOnRequests(asUser(E), [C.id]);
    const [forCurator] = await usersNamedOnRequests(asUser(F), [C.id]);
    expect(forAdmin?.email).toBe(email);
    expect(forCurator?.name).toBe(forAdmin?.name);
    expect(forCurator?.email).toBe('');
    const [self] = await usersNamedOnRequests(asUser(F), [F.id]);
    expect(self?.email).toBeTruthy();
  });

  it('filters by about, status and error code', async () => {
    const bug = await send(C, { ...INPUT, errorCode: 404 });
    await send(C, { ...INPUT, about: 'question' });
    const open = await listSupportRequests(
      asUser(E),
      { about: 'bug', status: 'open', errorCode: 404 },
      PAGE,
    );
    expect(open.map((entry) => entry.node.id)).toEqual([bug.id]);
  });

  it('refuses a curator a request that is neither marked nor assigned, until it is', async () => {
    const request = await send(C);
    expect(asUser(F).role).toBe('curator');
    expect((await failureOf(getSupportRequest(asUser(F), request.id))) as Error).toBeInstanceOf(
      NotFound,
    );
    expect((await getSupportRequest(asUser(E), request.id)).id).toBe(request.id);

    await setSupportRequestCuratorVisible(asUser(E), request.id, true);
    expect((await getSupportRequest(asUser(F), request.id)).id).toBe(request.id);

    await setSupportRequestCuratorVisible(asUser(E), request.id, false);
    await assignSupportRequest(asUser(E), request.id, F.id);
    expect((await getSupportRequest(asUser(F), request.id)).id).toBe(request.id);
  });

  it('refuses a user who is neither curator nor admin', async () => {
    const request = await send(C);
    expect(await failureOf(listSupportRequests(asUser(A), {}, PAGE))).toBeInstanceOf(Forbidden);
    expect(await failureOf(getSupportRequest(asUser(A), request.id))).toBeInstanceOf(Forbidden);
  });

  it('lets a curator read a hidden request’s replies only once it is visible to them', async () => {
    const request = await send(C);
    await replyToSupportRequest(asUser(E), request.id, 'Hello.', notifier());
    expect((await repliesForRequests(asUser(F), [request.id]))[0]).toEqual([]);
    await setSupportRequestCuratorVisible(asUser(E), request.id, true);
    expect((await repliesForRequests(asUser(F), [request.id]))[0]).toHaveLength(1);
  });
});

describe('replyToSupportRequest', () => {
  it('lets an admin reply to any request, stores the reply and starts its notice with ids alone', async () => {
    const request = await send(C);
    const mail = notifier();
    const reply = await replyToSupportRequest(asUser(E), request.id, 'A secret answer.', mail);

    expect(reply).toMatchObject({
      requestId: request.id,
      body: 'A secret answer.',
      createdBy: E.id,
    });
    expect(replyNotices()).toEqual([[reply.id, 'http://localhost:3000']]);
  });

  it('lets a curator reply only to a request assigned to them', async () => {
    const request = await send(C);
    await setSupportRequestCuratorVisible(asUser(E), request.id, true);
    const mail = notifier();

    expect(
      await failureOf(replyToSupportRequest(asUser(F), request.id, 'Hi.', mail)),
    ).toBeInstanceOf(Forbidden);
    expect(replyNotices()).toEqual([]);

    await assignSupportRequest(asUser(E), request.id, F.id);
    expect((await replyToSupportRequest(asUser(F), request.id, 'Hi.', mail)).createdBy).toBe(F.id);
  });

  it('refuses a body that is empty or over 4,000 characters, and a plain user', async () => {
    const request = await send(C);
    expect(
      await failureOf(replyToSupportRequest(asUser(E), request.id, ' ', notifier())),
    ).toBeInstanceOf(ValidationError);
    expect(
      await failureOf(replyToSupportRequest(asUser(E), request.id, 'x'.repeat(4001), notifier())),
    ).toBeInstanceOf(ValidationError);
    expect(
      await failureOf(replyToSupportRequest(asUser(C), request.id, 'Hi.', notifier())),
    ).toBeInstanceOf(Forbidden);
  });
});

describe('admin-only changes', () => {
  it('assigns and clears the assignee, and refuses a curator, who succeeds as an admin', async () => {
    const request = await send(C);
    expect(asUser(F).role).toBe('curator');
    expect(await failureOf(assignSupportRequest(asUser(F), request.id, F.id))).toBeInstanceOf(
      Forbidden,
    );

    expect((await assignSupportRequest(asUser(E), request.id, F.id)).assignedTo).toBe(F.id);
    expect((await assignSupportRequest(asUser(E), request.id, null)).assignedTo).toBeNull();
  });

  it('assigns only to a curator or an admin', async () => {
    const request = await send(C);
    expect(await failureOf(assignSupportRequest(asUser(E), request.id, A.id))).toBeInstanceOf(
      ValidationError,
    );
  });

  it('marks a request visible to curators, and refuses a curator', async () => {
    const request = await send(C);
    expect(
      await failureOf(setSupportRequestCuratorVisible(asUser(F), request.id, true)),
    ).toBeInstanceOf(Forbidden);
    expect(
      (await setSupportRequestCuratorVisible(asUser(E), request.id, true)).curatorVisible,
    ).toBe(true);
  });

  it('sets an issue on the project repository and refuses everything else', async () => {
    const request = await send(C);
    const issue = 'https://github.com/Aurora-Arctic/Sorrel-and-Salt/issues/1394';
    await setSupportRequestCuratorVisible(asUser(E), request.id, true);
    // The curator can read this request, so the refusal is the rule on the link and not on the request.
    expect((await getSupportRequest(asUser(F), request.id)).id).toBe(request.id);
    expect(await failureOf(setSupportRequestIssueUrl(asUser(F), request.id, issue))).toBeInstanceOf(
      Forbidden,
    );
    expect((await setSupportRequestIssueUrl(asUser(E), request.id, issue)).issueUrl).toBe(issue);

    for (const bad of [
      'https://github.com/Aurora-Arctic/Other/issues/1',
      'https://gitlab.com/Aurora-Arctic/Sorrel-and-Salt/issues/1',
      'https://github.com/Aurora-Arctic/Sorrel-and-Salt/pull/1',
      'https://github.com/Aurora-Arctic/Sorrel-and-Salt/issues/1/../../x',
      'https://github.com.evil.test/Aurora-Arctic/Sorrel-and-Salt/issues/1',
    ]) {
      expect(await failureOf(setSupportRequestIssueUrl(asUser(E), request.id, bad))).toBeInstanceOf(
        ValidationError,
      );
    }
    const board =
      'https://github.com/orgs/Aurora-Arctic/projects/1/views/1?pane=issue&itemId=289423269&issue=Aurora-Arctic%7CSorrel-and-Salt%7C1409';
    expect((await setSupportRequestIssueUrl(asUser(E), request.id, board)).issueUrl).toBe(
      'https://github.com/Aurora-Arctic/Sorrel-and-Salt/issues/1409',
    );
    expect((await setSupportRequestIssueUrl(asUser(E), request.id, null)).issueUrl).toBeNull();
  });

  it('times a sender out and lifts it, refusing a curator both', async () => {
    expect(asUser(F).role).toBe('curator');
    expect(
      await failureOf(
        timeOutSupportSender(asUser(F), C.id, FUTURE(), 'Spam', noPauseNotifier, PAUSE_MESSAGE),
      ),
    ).toBeInstanceOf(Forbidden);
    const timeout = await timeOutSupportSender(
      asUser(E),
      C.id,
      FUTURE(),
      ' spam ',
      noPauseNotifier,
      PAUSE_MESSAGE,
    );
    expect(timeout).toMatchObject({ userId: C.id, note: 'spam', liftedAt: null });

    expect(await failureOf(liftSupportTimeout(asUser(F), timeout.id))).toBeInstanceOf(Forbidden);
    expect((await liftSupportTimeout(asUser(E), timeout.id)).liftedAt).toBeInstanceOf(Date);
  });

  it.each([
    ['the System account', SYSTEM_ACTOR_ID],
    ['the signed-out sender account', SIGNED_OUT_SENDER_ID],
  ])('refuses to time out %s, which is not a person, saying why', async (_label, accountId) => {
    // Why this could have succeeded: the account is a live user, and the same call times a person out.
    expect(
      await sql`select id from users where id = ${accountId} and deleted_at is null`,
    ).toHaveLength(1);
    await timeOutSupportSender(asUser(E), C.id, FUTURE(), 'Spam', noPauseNotifier, PAUSE_MESSAGE);
    expect(await sql`select id from support_timeouts where user_id = ${C.id}`).toHaveLength(1);

    const error = await failureOf(
      timeOutSupportSender(asUser(E), accountId, FUTURE(), 'Spam', noPauseNotifier, PAUSE_MESSAGE),
    );

    expect(error).toBeInstanceOf(Forbidden);
    expect((error as Error).message).toBe(
      'This account is not a person, so it cannot be timed out of support',
    );
    expect(await sql`select id from support_timeouts where user_id = ${accountId}`).toHaveLength(0);
  });

  it('times a sender out with no end date, and the time-out stands until lifted', async () => {
    const timeout = await timeOutSupportSender(
      asUser(E),
      C.id,
      null,
      'Spam',
      noPauseNotifier,
      PAUSE_MESSAGE,
    );
    expect(timeout).toMatchObject({ userId: C.id, until: null, note: 'Spam', liftedAt: null });
    expect((await standingTimeoutsOf(asUser(E), [C.id]))[0]?.id).toBe(timeout.id);

    await liftSupportTimeout(asUser(E), timeout.id);
    expect((await standingTimeoutsOf(asUser(E), [C.id]))[0]).toBeUndefined();
  });

  it('lists the open-ended time-out for a sender who also holds a dated one', async () => {
    await timeOutSupportSender(
      asUser(E),
      C.id,
      new Date(Date.now() + 86_400_000),
      'Spam',
      noPauseNotifier,
      PAUSE_MESSAGE,
    );
    const open = await timeOutSupportSender(
      asUser(E),
      C.id,
      null,
      'Spam again',
      noPauseNotifier,
      PAUSE_MESSAGE,
    );
    await timeOutSupportSender(
      asUser(E),
      C.id,
      new Date(Date.now() + 2 * 86_400_000),
      'Spam',
      noPauseNotifier,
      PAUSE_MESSAGE,
    );

    expect((await standingTimeoutsOf(asUser(E), [C.id]))[0]?.id).toBe(open.id);
  });

  it.each([
    ['no note', undefined],
    ['a null note', null],
    ['a blank note', '   '],
  ])('refuses a time-out with %s, in its own sentence, and sets none', async (_what, note) => {
    const refusal = await failureOf(
      timeOutSupportSender(
        asUser(E),
        C.id,
        null,
        note as unknown as string,
        noPauseNotifier,
        PAUSE_MESSAGE,
      ),
    );
    expect(refusal).toBeInstanceOf(ValidationError);
    expect((refusal as Error).message).toBe('Write a note saying why');
    expect((await standingTimeoutsOf(asUser(E), [C.id]))[0]).toBeUndefined();
  });

  it('refuses a note over 500 characters, in its own sentence', async () => {
    const refusal = await failureOf(
      timeOutSupportSender(asUser(E), C.id, null, 'x'.repeat(501), noPauseNotifier, PAUSE_MESSAGE),
    );
    expect((refusal as Error).message).toBe('Keep the note to 500 characters');
  });

  it.each([
    ['a curator', F],
    ['a plain user', B],
  ])('refuses %s setting or lifting a time-out by direct id', async (_who, caller) => {
    // The precondition: an admin may set the same open-ended time-out on the same sender, and lift it.
    const set = await timeOutSupportSender(
      asUser(E),
      C.id,
      null,
      'Spam',
      noPauseNotifier,
      PAUSE_MESSAGE,
    );
    expect(set.userId).toBe(C.id);

    expect(
      await failureOf(
        timeOutSupportSender(asUser(caller), C.id, null, 'Spam', noPauseNotifier, PAUSE_MESSAGE),
      ),
    ).toBeInstanceOf(Forbidden);
    expect(await failureOf(liftSupportTimeout(asUser(caller), set.id))).toBeInstanceOf(Forbidden);
    expect((await standingTimeoutsOf(asUser(E), [C.id]))[0]?.id).toBe(set.id);
    expect((await liftSupportTimeout(asUser(E), set.id)).liftedAt).toBeInstanceOf(Date);
  });

  it('refuses a time-out that ends in the past', async () => {
    expect(
      await failureOf(
        timeOutSupportSender(
          asUser(E),
          C.id,
          new Date(Date.now() - 1000),
          'Spam',
          noPauseNotifier,
          PAUSE_MESSAGE,
        ),
      ),
    ).toBeInstanceOf(ValidationError);
  });

  it('reads a sender’s time-outs for an admin alone', async () => {
    await timeOutSupportSender(asUser(E), C.id, FUTURE(), 'Spam', noPauseNotifier, PAUSE_MESSAGE);
    expect((await timeoutsForSenders(asUser(E), [C.id]))[0]).toHaveLength(1);
    expect((await timeoutsForSenders(asUser(F), [C.id]))[0]).toBeInstanceOf(Forbidden);
  });
});

describe('standingTimeoutsOf', () => {
  it('answers each sender’s standing time-out in the order asked, and none where none stands', async () => {
    const standing = await timeOutSupportSender(
      asUser(E),
      C.id,
      FUTURE(),
      'Spam',
      noPauseNotifier,
      PAUSE_MESSAGE,
    );

    const answered = await standingTimeoutsOf(asUser(E), [D.id, C.id]);

    expect(answered.map((row) => row?.id)).toEqual([undefined, standing.id]);
  });

  it.each([
    ['a curator', F],
    ['a plain user', B],
  ])('refuses %s with Forbidden', async (_who, caller) => {
    await timeOutSupportSender(asUser(E), C.id, FUTURE(), 'Spam', noPauseNotifier, PAUSE_MESSAGE);
    // The precondition: the same read by an admin answers the time-out.
    expect((await standingTimeoutsOf(asUser(E), [C.id]))[0]).toBeDefined();

    expect(await failureOf(standingTimeoutsOf(asUser(caller), [C.id]))).toBeInstanceOf(Forbidden);
  });
});

describe('resolveSupportRequest', () => {
  it('records who and when, for an admin on any request', async () => {
    const request = await send(C);
    const resolved = await resolveSupportRequest(asUser(E), request.id, notifier());
    expect(resolved).toMatchObject({ status: 'resolved', resolvedBy: E.id });
    expect(resolved.resolvedAt).toBeInstanceOf(Date);
  });

  it('lets a curator resolve only a request assigned to them', async () => {
    const request = await send(C);
    await setSupportRequestCuratorVisible(asUser(E), request.id, true);
    expect(
      await failureOf(resolveSupportRequest(asUser(F), request.id, notifier())),
    ).toBeInstanceOf(Forbidden);

    await assignSupportRequest(asUser(E), request.id, F.id);
    expect((await resolveSupportRequest(asUser(F), request.id, notifier())).resolvedBy).toBe(F.id);
  });
});

describe('the cursor', () => {
  it('pages through open and resolved requests by a cursor that round-trips', async () => {
    await send(C);
    const resolved = await send(C);
    await resolveSupportRequest(asUser(E), resolved.id, notifier());
    const first = await listSupportRequests(asUser(E), {}, { limit: 2, inverted: false });
    expect(first).toHaveLength(2);
    const rest = await listSupportRequests(
      asUser(E),
      {},
      { limit: 2, inverted: false, after: first[0]!.cursor },
    );
    expect(rest.map((entry) => entry.node.id)).toEqual([resolved.id]);
  });
});

describe('an anonymised request in the staff list', () => {
  // Two ordinary closed requests and an anonymised one sent after both: newest first alone would put it ahead of them.
  const closedTrio = async () => {
    const older = await send(C);
    const newer = await send(D);
    const anonymised = await send(C);
    for (const request of [older, newer, anonymised]) {
      await closeSupportRequest(asUser(E), request.id);
    }
    await sql`update support_requests set created_at = now() - interval '2 hours' where id = ${older.id}`;
    await sql`update support_requests set created_at = now() - interval '1 hour' where id = ${newer.id}`;
    await sql`update support_requests set created_by = ${SYSTEM_ACTOR_ID} where id = ${anonymised.id}`;
    return { older, newer, anonymised };
  };

  it('comes after every ordinary request in the same view, though it is the newest', async () => {
    const { older, newer, anonymised } = await closedTrio();
    const [{ created_at: anonymisedAt }] =
      await sql`select created_at from support_requests where id = ${anonymised.id}`;
    const [{ created_at: newerAt }] =
      await sql`select created_at from support_requests where id = ${newer.id}`;
    expect(anonymisedAt.getTime()).toBeGreaterThan(newerAt.getTime());

    const ids = (await listSupportRequests(asUser(E), { view: 'closed' }, PAGE)).map(
      (entry) => entry.node.id,
    );

    expect(ids).toEqual([newer.id, older.id, anonymised.id]);
  });

  it('pages across the boundary one row at a time, every row once and in order, and counts the rows before it', async () => {
    const { older, newer, anonymised } = await closedTrio();
    const seen: PageEntry<{ id: string }>[] = [];
    let after: Cursor | undefined;
    for (let page = 0; page < 10; page += 1) {
      const entries = await listSupportRequests(
        asUser(E),
        { view: 'closed' },
        { limit: 1, inverted: false, ...(after ? { after } : {}) },
      );
      if (entries.length === 0) break;
      seen.push(...entries);
      after = entries[entries.length - 1]!.cursor;
    }

    expect(seen.map((entry) => entry.node.id)).toEqual([newer.id, older.id, anonymised.id]);
    // The anonymised row's page starts after both ordinary rows, so its position counts them.
    expect(await countSupportRequests(asUser(E), { view: 'closed' }, seen[2]!.cursor)).toEqual({
      totalCount: 3,
      countBefore: 2,
    });
  });
});

describe('getMySupportTimeout', () => {
  it('names when the sender’s live time-out ends, and nothing once it is lifted', async () => {
    expect(await getMySupportTimeout(asUser(C))).toBeNull();
    const until = FUTURE();
    const timeout = await timeOutSupportSender(
      asUser(E),
      C.id,
      until,
      'Spam',
      noPauseNotifier,
      PAUSE_MESSAGE,
    );
    expect((await getMySupportTimeout(asUser(C)))?.until?.getTime()).toBe(until.getTime());
    // Another sender's time-out is outside the query.
    expect(await getMySupportTimeout(asUser(B))).toBeNull();
    await liftSupportTimeout(asUser(E), timeout.id);
    expect(await getMySupportTimeout(asUser(C))).toBeNull();
  });

  it('answers a time-out with no end date as standing, with no end', async () => {
    await timeOutSupportSender(asUser(E), C.id, null, 'Spam', noPauseNotifier, PAUSE_MESSAGE);
    expect(await getMySupportTimeout(asUser(C))).toEqual({ until: null });
  });

  it('answers no end when a dated and an open-ended time-out both stand', async () => {
    await timeOutSupportSender(asUser(E), C.id, FUTURE(), 'Spam', noPauseNotifier, PAUSE_MESSAGE);
    await timeOutSupportSender(asUser(E), C.id, null, 'Spam again', noPauseNotifier, PAUSE_MESSAGE);
    expect(await getMySupportTimeout(asUser(C))).toEqual({ until: null });
  });

  it('refuses an unverified account', async () => {
    const unverified = { ...asUser(C), emailUnverified: true as const };
    expect(await failureOf(getMySupportTimeout(unverified))).toBeInstanceOf(Forbidden);
    expect(await getMySupportTimeout(asUser(C))).toBeNull();
  });
});
