import { beforeEach, describe, expect, it, vi } from 'vitest';
import type postgres from 'postgres';
import {
  addSupportInternalNote,
  replyToSupportRequest,
  resolveSupportRequest,
  sendSignedOutSupportRequest,
  sendSupportRequest,
} from '@/modules/support';
import type { SupportNotifier } from '@/modules/support';
import { supportNotifier } from '@/lib/support-mail';
import { C, E, asUser } from '../../../support/as-user';
import { useTestDatabase } from '../../../support/db/database';

// Which status mail each service move sends, to whom, and that no internal note reaches any of them.

const sent = vi.hoisted(() => [] as { to: string; subject: string; text: string; html: string }[]);

vi.mock('@/lib/mail', () => ({
  send: async (message: (typeof sent)[number]) => {
    sent.push(message);
  },
}));

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
    origin: async () => 'http://localhost:3000',
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

describe('the rendered mails', () => {
  const real = () => supportNotifier(new Request('http://localhost:8000/api/graphql'));
  const SIGNED_OUT = {
    about: 'account',
    email: 'visitor@example.test',
    subject: 'I cannot sign in',
    message: 'No code.',
  } as const;

  beforeEach(() => {
    sent.length = 0;
  });

  it('carry no internal note text in any of the four mails, signed in', async () => {
    const notifier = real();
    const request = await sendSupportRequest(asUser(C), INPUT, notifier);
    // Precondition: the note is saved on the request, so a leak would have text to carry.
    await addSupportInternalNote(asUser(E), request.id, NOTE);
    expect(await sql`select 1 from support_replies where body = ${NOTE}`).toHaveLength(1);
    await replyToSupportRequest(asUser(E), request.id, 'Which jar?', notifier);
    await resolveSupportRequest(asUser(E), request.id, notifier);
    await notifier.closingSoon(await emailOf(C.id), INPUT.subject, request.id);

    expect(sent).toHaveLength(4);
    for (const message of sent) {
      expect(message.html).not.toContain('repeat caller');
      expect(message.text).not.toContain('repeat caller');
      expect(message.subject).not.toContain('repeat caller');
    }
  });

  it('link a signed-out sender to nothing behind an account, in every mail they receive', async () => {
    const notifier = real();
    await sendSignedOutSupportRequest(SIGNED_OUT, { clientIp: '203.0.113.7', notifier });
    const [row] = await sql`select id from support_requests`;
    await addSupportInternalNote(asUser(E), row!.id as string, NOTE);
    await replyToSupportRequest(asUser(E), row!.id as string, 'Use the card.', notifier);
    await resolveSupportRequest(asUser(E), row!.id as string, notifier);
    await notifier.closingSoon(SIGNED_OUT.email, SIGNED_OUT.subject, null);

    // received, replied, resolved, closing soon
    expect(sent).toHaveLength(4);
    for (const message of sent) {
      expect(message.to).toBe(SIGNED_OUT.email);
      expect(message.html).not.toContain('/account');
      expect(message.text).not.toContain('/account');
      expect(message.html).not.toContain('repeat caller');
      expect(message.text).not.toContain('repeat caller');
    }
  });
});
