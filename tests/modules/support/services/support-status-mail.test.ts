import { beforeEach, describe, expect, it } from 'vitest';
import type postgres from 'postgres';
import {
  addSupportInternalNote,
  replyToSupportRequest,
  resolveSupportRequest,
  sendSignedOutSupportRequest,
  sendSupportRequest,
} from '@/modules/support';
import type { SupportNotifier } from '@/modules/support';
import { C, E, asUser } from '../../../support/as-user';
import { useTestDatabase } from '../../../support/db/database';

// Which status mail each service move sends, to whom, and that no internal note reaches any of them.

let sql: postgres.Sql;
useTestDatabase((client) => {
  sql = client;
});

beforeEach(async () => {
  await sql`truncate support_replies, support_timeouts, support_requests, support_send_counts cascade`;
});

const INPUT = { about: 'bug', subject: 'The jar will not open', message: 'It sticks.' } as const;
const NOTE = 'Internal: the sender looks like a repeat caller.';

function recorder() {
  const calls: { kind: string; args: unknown[] }[] = [];
  const record =
    (kind: string) =>
    async (...args: unknown[]) => {
      calls.push({ kind, args });
    };
  const mail: SupportNotifier = {
    replyWaiting: record('replyWaiting'),
    received: record('received'),
    resolved: record('resolved'),
    closingSoon: record('closingSoon'),
    signedOutReply: record('signedOutReply'),
  };
  return { mail, calls };
}

const emailOf = async (userId: string) =>
  (await sql`select email from users where id = ${userId}`)[0]!.email as string;

describe('the received mail', () => {
  it('goes to a signed-in sender once the request is saved, linking to the request', async () => {
    const { mail, calls } = recorder();

    const request = await sendSupportRequest(asUser(C), INPUT, mail);

    expect(calls).toEqual([
      { kind: 'received', args: [await emailOf(C.id), INPUT.subject, request.id] },
    ]);
  });

  it('goes to a signed-out sender with no request id, so it links to nothing behind a sign-in', async () => {
    const { mail, calls } = recorder();

    await sendSignedOutSupportRequest(
      {
        about: 'account',
        email: 'visitor@example.test',
        subject: 'I cannot sign in',
        message: 'No code.',
      },
      { clientIp: '203.0.113.7', notifier: mail },
    );

    expect(calls).toEqual([
      { kind: 'received', args: ['visitor@example.test', 'I cannot sign in', null] },
    ]);
  });
});

describe('the resolved mail', () => {
  it('goes to the sender when staff resolve the request, and not when the move is refused', async () => {
    const request = await sendSupportRequest(asUser(C), INPUT, recorder().mail);
    const { mail, calls } = recorder();

    await resolveSupportRequest(asUser(E), request.id, mail);
    expect(calls).toEqual([
      { kind: 'resolved', args: [await emailOf(C.id), INPUT.subject, request.id] },
    ]);

    // Precondition: the request is now resolved, so a second resolve is refused by the guarded move.
    await expect(resolveSupportRequest(asUser(E), request.id, mail)).rejects.toThrow();
    expect(calls).toHaveLength(1);
  });

  it('goes to a signed-out sender with no request id', async () => {
    await sendSignedOutSupportRequest(
      {
        about: 'account',
        email: 'visitor@example.test',
        subject: 'I cannot sign in',
        message: 'No code.',
      },
      { clientIp: '203.0.113.7', notifier: recorder().mail },
    );
    const [row] = await sql`select id from support_requests`;
    const { mail, calls } = recorder();

    await resolveSupportRequest(asUser(E), row!.id as string, mail);

    expect(calls).toEqual([
      { kind: 'resolved', args: ['visitor@example.test', 'I cannot sign in', null] },
    ]);
  });
});

describe('an internal note', () => {
  it('reaches none of the mails a request sends', async () => {
    const { mail, calls } = recorder();
    const request = await sendSupportRequest(asUser(C), INPUT, mail);
    // Precondition: the note is saved on the request before the mails go.
    await addSupportInternalNote(asUser(E), request.id, NOTE);
    expect(await sql`select 1 from support_replies where body = ${NOTE}`).toHaveLength(1);

    await replyToSupportRequest(asUser(E), request.id, 'Which jar?', mail);
    await resolveSupportRequest(asUser(E), request.id, mail);

    expect(calls.map((call) => call.kind)).toEqual(['received', 'replyWaiting', 'resolved']);
    expect(JSON.stringify(calls)).not.toContain('repeat caller');
  });
});
