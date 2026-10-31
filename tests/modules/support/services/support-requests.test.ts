import { beforeEach, describe, expect, it } from 'vitest';
import type postgres from 'postgres';
import { Forbidden, NotFound, ValidationError } from '@/lib/errors';
import type { PageRequest } from '@/lib/types';
import {
  assignSupportRequest,
  getMySupportRequest,
  countMySupportRequestsByStatus,
  getMySupportTimeoutEnd,
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
  usersNamedOnRequests,
} from '@/modules/support';
import type { SupportNotifier } from '@/modules/support';
import { A, B, C, D, E, F, asUser } from '../../../support/as-user';
import { failureOf, useTestDatabase } from '../../../support/db/database';
import type { SessionUser } from '../../../support/types';
import { makeWorkspace, workspaceColumns } from '../../../support/fixtures';

// The support services by direct call: who may send, read, answer and manage a request, each refusal paired with the
// same call succeeding once its precondition holds (claude-docs/design-decisions/m15.1-support-form.md).

let sql: postgres.Sql;
useTestDatabase((client) => {
  sql = client;
});

beforeEach(async () => {
  await sql`truncate support_replies, support_timeouts, support_requests cascade`;
});

const PAGE: PageRequest = { limit: 101, inverted: false };
const FUTURE = () => new Date(Date.now() + 3_600_000);
const INPUT = { about: 'bug', subject: 'The jar will not open', message: 'It sticks.' } as const;

function notifier(): SupportNotifier & { sent: string[]; subjects: string[] } {
  const sent: string[] = [];
  const subjects: string[] = [];
  return {
    sent,
    subjects,
    replyWaiting: async (to, subject) => {
      sent.push(to);
      subjects.push(subject);
    },
    signedOutReceived: async () => undefined,
    signedOutReply: async () => undefined,
  };
}

const send = (user: SessionUser = C, input: Parameters<typeof sendSupportRequest>[1] = INPUT) =>
  sendSupportRequest(asUser(user), input);

async function emailOf(user: SessionUser): Promise<string> {
  const [row] = await sql`select email from users where id = ${user.id}`;
  return row!.email as string;
}

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
    expect(await failureOf(sendSupportRequest(unverified, INPUT))).toBeInstanceOf(Forbidden);
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
    const timeout = await timeOutSupportSender(asUser(E), C.id, until, null);
    const refusal = await failureOf(send(C));
    expect(refusal).toBeInstanceOf(Forbidden);
    expect((refusal as Forbidden).message).toContain(
      until.toISOString().slice(0, 16).replace('T', ' '),
    );

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
    await resolveSupportRequest(asUser(E), resolved.id);

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
  it('lets an admin reply to any request, stores the reply and notifies the sender without its text', async () => {
    const request = await send(C);
    const mail = notifier();
    const reply = await replyToSupportRequest(asUser(E), request.id, 'A secret answer.', mail);

    expect(reply).toMatchObject({
      requestId: request.id,
      body: 'A secret answer.',
      createdBy: E.id,
    });
    expect(mail.sent).toEqual([await emailOf(C)]);
    expect(mail.subjects).toEqual([INPUT.subject]);
  });

  it('lets a curator reply only to a request assigned to them', async () => {
    const request = await send(C);
    await setSupportRequestCuratorVisible(asUser(E), request.id, true);
    const mail = notifier();

    expect(
      await failureOf(replyToSupportRequest(asUser(F), request.id, 'Hi.', mail)),
    ).toBeInstanceOf(Forbidden);
    expect(mail.sent).toEqual([]);

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
    expect(await failureOf(timeOutSupportSender(asUser(F), C.id, FUTURE(), null))).toBeInstanceOf(
      Forbidden,
    );
    const timeout = await timeOutSupportSender(asUser(E), C.id, FUTURE(), ' spam ');
    expect(timeout).toMatchObject({ userId: C.id, note: 'spam', liftedAt: null });

    expect(await failureOf(liftSupportTimeout(asUser(F), timeout.id))).toBeInstanceOf(Forbidden);
    expect((await liftSupportTimeout(asUser(E), timeout.id)).liftedAt).toBeInstanceOf(Date);
  });

  it('refuses a time-out that ends in the past', async () => {
    expect(
      await failureOf(timeOutSupportSender(asUser(E), C.id, new Date(Date.now() - 1000), null)),
    ).toBeInstanceOf(ValidationError);
  });

  it('reads a sender’s time-outs for an admin alone', async () => {
    await timeOutSupportSender(asUser(E), C.id, FUTURE(), null);
    expect((await timeoutsForSenders(asUser(E), [C.id]))[0]).toHaveLength(1);
    expect((await timeoutsForSenders(asUser(F), [C.id]))[0]).toBeInstanceOf(Forbidden);
  });
});

describe('resolveSupportRequest', () => {
  it('records who and when, for an admin on any request', async () => {
    const request = await send(C);
    const resolved = await resolveSupportRequest(asUser(E), request.id);
    expect(resolved).toMatchObject({ status: 'resolved', resolvedBy: E.id });
    expect(resolved.resolvedAt).toBeInstanceOf(Date);
  });

  it('lets a curator resolve only a request assigned to them', async () => {
    const request = await send(C);
    await setSupportRequestCuratorVisible(asUser(E), request.id, true);
    expect(await failureOf(resolveSupportRequest(asUser(F), request.id))).toBeInstanceOf(Forbidden);

    await assignSupportRequest(asUser(E), request.id, F.id);
    expect((await resolveSupportRequest(asUser(F), request.id)).resolvedBy).toBe(F.id);
  });
});

describe('the cursor', () => {
  it('pages through open and resolved requests by a cursor that round-trips', async () => {
    await send(C);
    const resolved = await send(C);
    await resolveSupportRequest(asUser(E), resolved.id);
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

describe('getMySupportTimeoutEnd', () => {
  it('names when the sender’s live time-out ends, and nothing once it is lifted', async () => {
    expect(await getMySupportTimeoutEnd(asUser(C))).toBeNull();
    const until = FUTURE();
    const timeout = await timeOutSupportSender(asUser(E), C.id, until, null);
    expect((await getMySupportTimeoutEnd(asUser(C)))?.getTime()).toBe(until.getTime());
    // Another sender's time-out is outside the query.
    expect(await getMySupportTimeoutEnd(asUser(B))).toBeNull();
    await liftSupportTimeout(asUser(E), timeout.id);
    expect(await getMySupportTimeoutEnd(asUser(C))).toBeNull();
  });

  it('refuses an unverified account', async () => {
    const unverified = { ...asUser(C), emailUnverified: true as const };
    expect(await failureOf(getMySupportTimeoutEnd(unverified))).toBeInstanceOf(Forbidden);
    expect(await getMySupportTimeoutEnd(asUser(C))).toBeNull();
  });
});
