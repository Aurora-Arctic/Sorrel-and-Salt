import { beforeEach, describe, expect, it } from 'vitest';
import type postgres from 'postgres';
import { Forbidden, NotFound, ValidationError } from '@/lib/errors';
import type { PageRequest } from '@/lib/types';
import {
  addSupportInternalNote,
  assignSupportRequest,
  closeResolvedRequests,
  closeSupportRequest,
  getMySupportRequest,
  getSupportRequest,
  listSupportRequests,
  repliesForRequests,
  replyToSupportRequest,
  resolveSupportRequest,
  sendSenderMessage,
  sendSupportRequest,
  supportTiersForSenders,
  timeOutSupportSender,
} from '@/modules/support';
import type { SupportNotifier } from '@/modules/support';
import { A, B, C, D, E, F, asUser } from '../../../support/as-user';
import { failureOf, useTestDatabase } from '../../../support/db/database';

// The support lifecycle by direct call: each row of the transition table, the pairs it leaves out, the reopen guard, what a
// sender never reads, and the tier derived from a card.

let sql: postgres.Sql;
useTestDatabase((client) => {
  sql = client;
});

beforeEach(async () => {
  await sql`truncate support_replies, support_timeouts, support_requests cascade`;
});

const PAGE: PageRequest = { limit: 101, inverted: false };
const INPUT = { about: 'bug', subject: 'The jar will not open', message: 'It sticks.' } as const;
const mail: SupportNotifier = {
  replyWaiting: async () => undefined,
  signedOutReceived: async () => undefined,
  signedOutReply: async () => undefined,
};

const send = () => sendSupportRequest(asUser(C), INPUT);
const waiting = () =>
  send().then(async (request) => {
    await replyToSupportRequest(asUser(E), request.id, 'Which jar?', mail, {
      waitingOnSender: true,
    });
    return request;
  });
const statusOf = async (id: string) =>
  (await sql`select status from support_requests where id = ${id}`)[0]!.status as string;

describe('a new request', () => {
  it('opens, stamped with the sender’s activity and no staff activity', async () => {
    const request = await send();

    expect(request.status).toBe('open');
    expect(request.lastSenderActivityAt).toBeInstanceOf(Date);
    expect(request.lastStaffActivityAt).toBeNull();
    expect(request.linkedFrom).toBeNull();
  });
});

describe('the staff transitions', () => {
  it('moves open to waiting_on_sender on a reply marked waiting, and stamps the staff activity', async () => {
    const request = await send();
    await replyToSupportRequest(asUser(E), request.id, 'Which jar?', mail, {
      waitingOnSender: true,
    });

    const row = (await sql`select * from support_requests where id = ${request.id}`)[0]!;
    expect(row.status).toBe('waiting_on_sender');
    expect(row.last_staff_activity_at).toBeInstanceOf(Date);
  });

  it('leaves the status alone on a reply not marked waiting', async () => {
    const request = await send();
    await replyToSupportRequest(asUser(E), request.id, 'Looking.', mail);

    expect(await statusOf(request.id)).toBe('open');
  });

  it('refuses marking waiting on a request that is not open, and keeps the reply out', async () => {
    const request = await waiting();
    const error = await failureOf(
      replyToSupportRequest(asUser(E), request.id, 'Again?', mail, { waitingOnSender: true }),
    );

    expect(error).toBeInstanceOf(Forbidden);
    expect((error as Error).message).toMatch(/open/);
    const [{ n }] =
      await sql`select count(*)::int as n from support_replies where request_id = ${request.id}`;
    expect(n).toBe(1);
  });

  it('resolves an open request and a waiting one, stamping who and when', async () => {
    const open = await send();
    const resolved = await resolveSupportRequest(asUser(E), open.id);
    expect(resolved).toMatchObject({ status: 'resolved', resolvedBy: E.id });
    expect(resolved.resolvedAt).toBeInstanceOf(Date);

    const waitingOne = await waiting();
    expect((await resolveSupportRequest(asUser(E), waitingOne.id)).status).toBe('resolved');
  });

  it('refuses resolving a request that is already resolved or closed', async () => {
    const request = await send();
    await resolveSupportRequest(asUser(E), request.id);
    const again = await failureOf(resolveSupportRequest(asUser(E), request.id));
    expect(again).toBeInstanceOf(Forbidden);
    expect((again as Error).message).toMatch(/resolved/);

    await closeSupportRequest(asUser(E), request.id);
    expect(await failureOf(resolveSupportRequest(asUser(E), request.id))).toBeInstanceOf(Forbidden);
  });

  it.each(['open', 'waiting', 'resolved'])(
    'lets staff close a request that is %s',
    async (from) => {
      const request = from === 'waiting' ? await waiting() : await send();
      if (from === 'resolved') await resolveSupportRequest(asUser(E), request.id);

      const closed = await closeSupportRequest(asUser(E), request.id);

      expect(closed.status).toBe('closed');
      expect(closed.closedAt).toBeInstanceOf(Date);
    },
  );

  it('refuses closing a request that is already closed', async () => {
    const request = await send();
    await closeSupportRequest(asUser(E), request.id);

    expect(await failureOf(closeSupportRequest(asUser(E), request.id))).toBeInstanceOf(Forbidden);
  });

  it('lets a curator close only a request assigned to them', async () => {
    const request = await send();
    await sql`update support_requests set curator_visible = true where id = ${request.id}`;
    expect(await failureOf(closeSupportRequest(asUser(F), request.id))).toBeInstanceOf(Forbidden);

    await assignSupportRequest(asUser(E), request.id, F.id);
    expect((await closeSupportRequest(asUser(F), request.id)).status).toBe('closed');
  });
});

describe('a sender’s message', () => {
  it('keeps an open request open and stamps the sender’s activity', async () => {
    const request = await send();
    await sql`update support_requests set last_sender_activity_at = '2020-01-01' where id = ${request.id}`;

    const row = await sendSenderMessage(asUser(C), request.id, 'Still stuck.');

    expect(row.status).toBe('open');
    expect(row.lastSenderActivityAt!.getFullYear()).toBeGreaterThan(2020);
    const replies =
      await sql`select author_role, visibility, body from support_replies where request_id = ${request.id}`;
    expect(replies).toHaveLength(1);
    expect(replies[0]).toMatchObject({
      author_role: 'sender',
      visibility: 'public',
      body: 'Still stuck.',
    });
  });

  it('reopens a waiting_on_sender request, keeping the assignee', async () => {
    const request = await waiting();
    await assignSupportRequest(asUser(E), request.id, F.id);
    // The preconditions of the guard: the request is waiting, and the sender owns it.
    expect(await statusOf(request.id)).toBe('waiting_on_sender');
    expect((await getMySupportRequest(asUser(C), request.id)).id).toBe(request.id);

    const row = await sendSenderMessage(asUser(C), request.id, 'The red one.');

    expect(row.status).toBe('open');
    expect(row.assignedTo).toBe(F.id);
  });

  it('reopens a resolved request, clearing resolved_at, and keeps the assignee', async () => {
    const request = await send();
    await assignSupportRequest(asUser(E), request.id, F.id);
    await resolveSupportRequest(asUser(E), request.id);
    expect(await statusOf(request.id)).toBe('resolved');

    const row = await sendSenderMessage(asUser(C), request.id, 'It came back.');

    expect(row).toMatchObject({
      status: 'open',
      resolvedAt: null,
      resolvedBy: null,
      assignedTo: F.id,
    });
  });

  it('is refused for a request that is not the sender’s, which the guard alone holds', async () => {
    const request = await waiting();
    // Another account's request reads as absent, so the reopen cannot be reached by id.
    expect(await failureOf(sendSenderMessage(asUser(D), request.id, 'Mine now.'))).toBeInstanceOf(
      NotFound,
    );
    expect(await statusOf(request.id)).toBe('waiting_on_sender');
    expect((await sendSenderMessage(asUser(C), request.id, 'Mine.')).status).toBe('open');
  });

  it('refuses a staff reply to a closed request with an explaining error, and saves no reply', async () => {
    const request = await send();
    await closeSupportRequest(asUser(E), request.id);
    expect(await statusOf(request.id)).toBe('closed');

    const error = await failureOf(replyToSupportRequest(asUser(E), request.id, 'Too late.', mail));

    expect(error).toBeInstanceOf(Forbidden);
    expect((error as Error).message).toMatch(/closed/);
    expect(await sql`select 1 from support_replies where request_id = ${request.id}`).toHaveLength(
      0,
    );
  });

  it('opens a new request linked to a closed one, carrying topic and assignee, and leaves the closed one as it was', async () => {
    const request = await send();
    await assignSupportRequest(asUser(E), request.id, F.id);
    const closed = await closeSupportRequest(asUser(E), request.id);

    const followUp = await sendSenderMessage(asUser(C), closed.id, 'Same fault again.');

    expect(followUp.id).not.toBe(closed.id);
    expect(followUp).toMatchObject({
      status: 'open',
      linkedFrom: closed.id,
      about: closed.about,
      assignedTo: F.id,
      message: 'Same fault again.',
      createdBy: C.id,
    });
    expect(await statusOf(closed.id)).toBe('closed');
  });

  it('refuses a body that is empty or too long, an unverified account and a timed-out sender', async () => {
    const request = await send();
    expect(await failureOf(sendSenderMessage(asUser(C), request.id, ' '))).toBeInstanceOf(
      ValidationError,
    );
    expect(
      await failureOf(sendSenderMessage(asUser(C), request.id, 'x'.repeat(4001))),
    ).toBeInstanceOf(ValidationError);
    const unverified = { ...asUser(C), emailUnverified: true as const };
    expect(await failureOf(sendSenderMessage(unverified, request.id, 'Hi.'))).toBeInstanceOf(
      Forbidden,
    );

    await timeOutSupportSender(asUser(E), C.id, new Date(Date.now() + 3_600_000), null);
    const refused = await failureOf(sendSenderMessage(asUser(C), request.id, 'Hi.'));
    expect(refused).toBeInstanceOf(Forbidden);
    expect((refused as Error).message).toMatch(/until/);
  });
});

describe('internal notes', () => {
  it('are staff-only: the sender never reads one, by direct id or by the thread', async () => {
    const request = await send();
    await replyToSupportRequest(asUser(E), request.id, 'Public answer.', mail);
    await addSupportInternalNote(asUser(E), request.id, 'Sender seems confused.');
    // The precondition: the note exists in the table, on the sender's own request.
    const [{ n }] =
      await sql`select count(*)::int as n from support_replies where request_id = ${request.id} and visibility = 'internal'`;
    expect(n).toBe(1);
    expect((await getMySupportRequest(asUser(C), request.id)).id).toBe(request.id);

    const asSender = (await repliesForRequests(asUser(C), [request.id]))[0]!;
    expect(asSender.map((reply) => reply.body)).toEqual(['Public answer.']);
    const asStaff = (await repliesForRequests(asUser(E), [request.id]))[0]!;
    expect(asStaff.map((reply) => reply.body)).toEqual([
      'Public answer.',
      'Sender seems confused.',
    ]);
  });

  it('never change the status or mail the sender', async () => {
    const request = await send();
    const sent: string[] = [];
    await addSupportInternalNote(asUser(E), request.id, 'Note.');
    await replyToSupportRequest(asUser(E), request.id, 'Hi.', {
      replyWaiting: async (to) => {
        sent.push(to);
      },
      signedOutReceived: async () => undefined,
      signedOutReply: async () => undefined,
    });

    expect(await statusOf(request.id)).toBe('open');
    expect(sent).toHaveLength(1);
  });

  it('are written by an admin, and by a curator on any request they can read, assigned to them or not', async () => {
    const request = await send();
    await sql`update support_requests set curator_visible = true where id = ${request.id}`;
    // The precondition: the curator can read the request, and it is assigned to no one.
    expect((await getSupportRequest(asUser(F), request.id)).assignedTo).toBeNull();
    expect((await addSupportInternalNote(asUser(F), request.id, 'Note.')).visibility).toBe(
      'internal',
    );

    await assignSupportRequest(asUser(E), request.id, E.id);
    expect((await getSupportRequest(asUser(F), request.id)).assignedTo).toBe(E.id);
    expect((await addSupportInternalNote(asUser(F), request.id, 'Again.')).visibility).toBe(
      'internal',
    );
    expect((await addSupportInternalNote(asUser(E), request.id, 'Admin.')).visibility).toBe(
      'internal',
    );
  });

  it('are refused to a curator on a request not marked for curators, by direct id, and to a plain user', async () => {
    const request = await send();
    // The preconditions: the request exists and an admin can read it, while the curator cannot.
    expect((await getSupportRequest(asUser(E), request.id)).curatorVisible).toBe(false);
    expect(await failureOf(getSupportRequest(asUser(F), request.id))).toBeInstanceOf(NotFound);
    expect(await failureOf(addSupportInternalNote(asUser(F), request.id, 'Note.'))).toBeInstanceOf(
      NotFound,
    );

    await sql`update support_requests set curator_visible = true where id = ${request.id}`;
    for (const user of [A, B]) {
      expect(
        await failureOf(addSupportInternalNote(asUser(user), request.id, 'Note.')),
      ).toBeInstanceOf(Forbidden);
    }
  });

  it('leave replies assigned-only: a curator still cannot reply on a request that is visible but not theirs', async () => {
    const request = await send();
    await sql`update support_requests set curator_visible = true where id = ${request.id}`;
    expect((await getSupportRequest(asUser(F), request.id)).id).toBe(request.id);
    expect(
      await failureOf(replyToSupportRequest(asUser(F), request.id, 'Hello.', mail)),
    ).toBeInstanceOf(Forbidden);
  });
});

describe('closeResolvedRequests', () => {
  it('closes resolved requests idle for seven days and no others', async () => {
    const old = await send();
    const recent = await send();
    const open = await send();
    await resolveSupportRequest(asUser(E), old.id);
    await resolveSupportRequest(asUser(E), recent.id);
    await sql`update support_requests set resolved_at = now() - interval '8 days' where id = ${old.id}`;
    await sql`update support_requests set resolved_at = now() - interval '6 days' where id = ${recent.id}`;
    await sql`update support_requests set created_at = now() - interval '30 days' where id = ${open.id}`;

    const closed = await closeResolvedRequests(asUser(E), new Date());

    expect(closed.map((row) => row.id)).toEqual([old.id]);
    expect(await statusOf(old.id)).toBe('closed');
    expect(await statusOf(recent.id)).toBe('resolved');
    expect(await statusOf(open.id)).toBe('open');
    const [row] = await sql`select closed_at from support_requests where id = ${old.id}`;
    expect(row!.closed_at).toBeInstanceOf(Date);
  });
});

describe('the sender’s tier', () => {
  async function accept(kind: 'card' | 'address', userId: string) {
    const common = {
      token_hash: `hash-${Math.random()}`,
      accepted_at: new Date(),
      accepted_by: userId,
      created_by: A.id,
      updated_by: A.id,
    };
    if (kind === 'card') {
      await sql`insert into invitations ${sql({ ...common, kind: 'card' })}`;
    } else {
      await sql`insert into invitations ${sql({ ...common, kind: 'address', email: 'invited@example.test', site_role: 'curator' })}`;
    }
  }

  it('is beta_tester for an account that accepted a card, and standard for one that accepted an address invitation or none', async () => {
    await accept('card', C.id);
    await accept('address', D.id);

    const tiers = await supportTiersForSenders(asUser(E), [C.id, D.id, A.id]);

    expect(tiers).toEqual(['beta_tester', 'standard', 'standard']);
  });

  it('is read by staff alone', async () => {
    expect(await failureOf(supportTiersForSenders(asUser(C), [C.id]))).toBeInstanceOf(Forbidden);
  });

  it('shows on the admin list’s requests through the same derivation', async () => {
    await accept('card', C.id);
    const request = await send();
    const [entry] = await listSupportRequests(asUser(E), {}, PAGE);
    expect(entry!.node.id).toBe(request.id);
    expect((await supportTiersForSenders(asUser(E), [entry!.node.createdBy]))[0]).toBe(
      'beta_tester',
    );
  });
});
