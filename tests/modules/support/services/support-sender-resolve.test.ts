import { beforeEach, describe, expect, it } from 'vitest';
import type postgres from 'postgres';
import { Forbidden, NotFound } from '@/lib/errors';
import {
  assignSupportRequest,
  closeSupportRequest,
  getMySupportCounts,
  replyToSupportRequest,
  resolveMySupportRequest,
  resolveSupportRequest,
  sendSenderMessage,
  sendSupportRequest,
} from '@/modules/support';
import type { SupportNotifier } from '@/modules/support';
import { A, C, D, E, F, asUser } from '../../../support/as-user';
import { failureOf, useTestDatabase } from '../../../support/db/database';

// A sender resolving their own request, and the two counts the account menu draws from.

let sql: postgres.Sql;
useTestDatabase((client) => {
  sql = client;
});

beforeEach(async () => {
  await sql`truncate support_replies, support_timeouts, support_requests cascade`;
});

const INPUT = { about: 'bug', subject: 'The jar will not open', message: 'It sticks.' } as const;
const mail: SupportNotifier = {
  replyWaiting: async () => undefined,
  signedOutReceived: async () => undefined,
  signedOutReply: async () => undefined,
};

const sendAs = (user: typeof C) => sendSupportRequest(asUser(user), INPUT);
const waitOn = async (id: string) => {
  await replyToSupportRequest(asUser(E), id, 'Which jar?', mail, { waitingOnSender: true });
};
const row = async (id: string) => (await sql`select * from support_requests where id = ${id}`)[0]!;

describe('resolveMySupportRequest', () => {
  it('resolves the sender’s own waiting request, stamping who and when', async () => {
    const request = await sendAs(C);
    await waitOn(request.id);
    expect((await row(request.id)).status).toBe('waiting_on_sender');

    const resolved = await resolveMySupportRequest(asUser(C), request.id);

    expect(resolved).toMatchObject({ status: 'resolved', resolvedBy: C.id });
    expect(resolved.resolvedAt).toBeInstanceOf(Date);
    expect((await row(request.id)).status).toBe('resolved');
  });

  it('resolves the sender’s own open request', async () => {
    const request = await sendAs(C);
    expect((await resolveMySupportRequest(asUser(C), request.id)).status).toBe('resolved');
  });

  it('refuses another account’s request by direct id, which exists and is waiting', async () => {
    const request = await sendAs(C);
    await waitOn(request.id);
    // Preconditions: the row exists, is waiting, and belongs to C.
    const before = await row(request.id);
    expect(before).toMatchObject({ status: 'waiting_on_sender', created_by: C.id });

    expect(await failureOf(resolveMySupportRequest(asUser(D), request.id))).toBeInstanceOf(
      NotFound,
    );
    expect(await failureOf(resolveMySupportRequest(asUser(A), request.id))).toBeInstanceOf(
      NotFound,
    );
    expect((await row(request.id)).status).toBe('waiting_on_sender');
    expect((await row(request.id)).resolved_by).toBeNull();
  });

  it('refuses a resolved or closed request with an explaining error', async () => {
    const resolved = await sendAs(C);
    await resolveSupportRequest(asUser(E), resolved.id);
    const failure = await failureOf(resolveMySupportRequest(asUser(C), resolved.id));
    expect(failure).toBeInstanceOf(Forbidden);
    expect((failure as Error).message).toMatch(/open or waiting on sender/);

    const closed = await sendAs(C);
    await closeSupportRequest(asUser(E), closed.id);
    expect(await failureOf(resolveMySupportRequest(asUser(C), closed.id))).toBeInstanceOf(
      Forbidden,
    );
    expect((await row(closed.id)).status).toBe('closed');
  });

  it('refuses an unverified account', async () => {
    const request = await sendAs(C);
    const unverified = { ...asUser(C), emailUnverified: true as const };
    expect(await failureOf(resolveMySupportRequest(unverified, request.id))).toBeInstanceOf(
      Forbidden,
    );
  });

  it('lets the sender’s next message reopen it', async () => {
    const request = await sendAs(C);
    await resolveMySupportRequest(asUser(C), request.id);
    expect((await sendSenderMessage(asUser(C), request.id, 'Still stuck.')).status).toBe('open');
  });
});

describe('getMySupportCounts', () => {
  it('counts only open requests assigned to the viewer', async () => {
    const mine = await sendAs(C);
    const others = await sendAs(C);
    const resolvedMine = await sendAs(C);
    const waitingMine = await sendAs(C);
    const unassigned = await sendAs(C);
    await assignSupportRequest(asUser(E), mine.id, F.id);
    await assignSupportRequest(asUser(E), others.id, E.id);
    await assignSupportRequest(asUser(E), resolvedMine.id, F.id);
    await assignSupportRequest(asUser(E), waitingMine.id, F.id);
    await resolveSupportRequest(asUser(E), resolvedMine.id);
    await waitOn(waitingMine.id);
    expect((await row(unassigned.id)).assigned_to).toBeNull();

    expect((await getMySupportCounts(asUser(F))).assignedOpen).toBe(1);
    expect((await getMySupportCounts(asUser(E))).assignedOpen).toBe(1);
  });

  it('counts only the viewer’s own requests that wait on them', async () => {
    const mine = await sendAs(C);
    const openMine = await sendAs(C);
    const resolvedMine = await sendAs(C);
    const theirs = await sendAs(D);
    await waitOn(mine.id);
    await waitOn(theirs.id);
    await resolveSupportRequest(asUser(E), resolvedMine.id);
    expect((await row(openMine.id)).status).toBe('open');

    expect((await getMySupportCounts(asUser(C))).waitingOnMe).toBe(1);
    expect((await getMySupportCounts(asUser(D))).waitingOnMe).toBe(1);
    expect((await getMySupportCounts(asUser(A))).waitingOnMe).toBe(0);
  });

  it('drops a waiting request from the count when the sender answers, staff resolve it, or the sender resolves it', async () => {
    const answered = await sendAs(C);
    const staffResolved = await sendAs(C);
    const selfResolved = await sendAs(C);
    for (const request of [answered, staffResolved, selfResolved]) await waitOn(request.id);
    expect((await getMySupportCounts(asUser(C))).waitingOnMe).toBe(3);

    await sendSenderMessage(asUser(C), answered.id, 'The red one.');
    expect((await getMySupportCounts(asUser(C))).waitingOnMe).toBe(2);
    await resolveSupportRequest(asUser(E), staffResolved.id);
    expect((await getMySupportCounts(asUser(C))).waitingOnMe).toBe(1);
    await resolveMySupportRequest(asUser(C), selfResolved.id);
    expect((await getMySupportCounts(asUser(C))).waitingOnMe).toBe(0);
  });

  it('counts an assignment only for a curator or an admin', async () => {
    const request = await sendAs(C);
    await sql`update support_requests set assigned_to = ${D.id} where id = ${request.id}`;
    expect((await getMySupportCounts(asUser(D))).assignedOpen).toBe(0);
  });
});
