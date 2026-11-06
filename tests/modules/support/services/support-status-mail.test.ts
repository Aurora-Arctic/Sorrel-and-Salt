import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type postgres from 'postgres';
import {
  addSupportInternalNote,
  replyToSupportRequest,
  resolveSupportRequest,
  sendSignedOutSupportRequest,
  sendSupportRequest,
} from '@/modules/support';
import type { SupportNotifier, SupportStatusMail } from '@/modules/support';
import { supportStatusMail } from '@/modules/support/jobs/support-status-mail';
import { supportStatusStep } from '@/modules/support/jobs/support-status-mail-steps';
import { SYSTEM_ACTOR_ID } from '@/lib/system-actor';
import { supportNotifier } from '@/lib/support-mail';
import { retentionBatchStep } from '@/modules/support/jobs/support-retention-batch-steps';
import { supportReplyNotice } from '@/modules/support/jobs/support-reply-notice';
import { replyNoticeStep } from '@/modules/support/jobs/support-reply-notice-steps';
import { C, E, asUser } from '../../../support/as-user';
import { useTestDatabase } from '../../../support/db/database';

// Which status mail each service move sends, to whom, and that no internal note reaches any of them.

const sent = vi.hoisted(() => [] as { to: string; subject: string; text: string; html: string }[]);

vi.mock('@/lib/mail', () => ({
  send: async (message: (typeof sent)[number]) => {
    sent.push(message);
  },
}));

// The reply notice and the closing-soon notice are sent by jobs, through the transport itself. The jobs are not run here: a test
// calls the reply notice's step, or the daily support-retention job's notice batch step, as the runs would.
const { startJob } = vi.hoisted(() => ({
  startJob: vi.fn(async (..._args: unknown[]) => 'run-id'),
}));
vi.mock('@/lib/jobs', () => ({ startJob }));
vi.mock('@/lib/mail-transport', () => ({
  deliver: async (message: (typeof sent)[number]) => {
    sent.push(message);
    return true;
  },
}));

let sql: postgres.Sql;
useTestDatabase((client) => {
  sql = client;
});

afterEach(() => {
  vi.unstubAllEnvs();
});

beforeEach(async () => {
  startJob.mockClear();
  sent.length = 0;
  await sql`truncate support_replies, support_timeouts, support_requests, support_send_counts cascade`;
});

const INPUT = { about: 'bug', subject: 'The jar will not open', message: 'It sticks.' } as const;
const NOTE = 'Internal: the sender looks like a repeat caller.';
/** Day 6 after a request resolved just now, inside its closing-soon window, as the daily job would see it. */
const noticeDay = () => Date.now() + 6 * 24 * 60 * 60 * 1000;

const emailOf = async (userId: string) =>
  (await sql`select email from users where id = ${userId}`)[0]!.email as string;

const mail: SupportNotifier = { origin: async () => 'http://localhost:3000' };

/** The status mail runs started so far, each run's one argument. */
const statusRuns = () =>
  startJob.mock.calls
    .filter(([job]) => job === supportStatusMail)
    .map(([, args]) => (args as [SupportStatusMail])[0]);

/** Runs each started status mail's step, as the job would, and returns the mails the transport took. */
async function sendStatusRuns() {
  sent.length = 0;
  for (const run of statusRuns()) await supportStatusStep(run);
  return [...sent];
}

const SIGNED_OUT = {
  about: 'account',
  email: 'visitor@example.test',
  subject: 'I cannot sign in',
  message: 'No code.',
} as const;

describe('the received mail', () => {
  beforeEach(() => {
    // Set, so the mail starts its job rather than being tried once here.
    vi.stubEnv('MAIL_TRANSPORT', 'smtp');
  });

  it('starts a run holding the request id and the origin alone, whose step mails a signed-in sender a link to the request', async () => {
    const request = await sendSupportRequest(asUser(C), INPUT, mail);

    expect(statusRuns()).toEqual([
      { kind: 'received', requestId: request.id, origin: 'http://localhost:3000' },
    ]);
    const [message] = await sendStatusRuns();
    expect(message!.to).toBe(await emailOf(C.id));
    expect(message!.subject).toContain(INPUT.subject);
    expect(message!.text).toContain(`/account/support?request=${request.id}`);
  });

  it('carries no address or subject of a signed-out sender in its run, and its step mails them the link that opens the request', async () => {
    await sendSignedOutSupportRequest(SIGNED_OUT, {
      clientIp: '203.0.113.7',
      notifier: mail,
    } as Parameters<typeof sendSignedOutSupportRequest>[1]);

    const [row] = await sql`select id from support_requests`;
    expect(statusRuns()).toEqual([
      { kind: 'received', requestId: row!.id, origin: 'http://localhost:3000' },
    ]);
    expect(JSON.stringify(statusRuns())).not.toContain(SIGNED_OUT.email);
    expect(JSON.stringify(statusRuns())).not.toContain(SIGNED_OUT.subject);
    const [message] = await sendStatusRuns();
    expect(message!.to).toBe(SIGNED_OUT.email);
    expect(message!.text).toMatch(/http:\/\/localhost:3000\/support\/request#[A-Za-z0-9_-]{32,}/);
    expect(message!.text).not.toContain('/account');
  });

  it('reads the address when it sends, so a run for an anonymised request sends nothing', async () => {
    await sendSignedOutSupportRequest(SIGNED_OUT, {
      clientIp: '203.0.113.7',
      notifier: mail,
    } as Parameters<typeof sendSignedOutSupportRequest>[1]);
    // Precondition: the run was started, and the step would have mailed the sender.
    expect(statusRuns()).toHaveLength(1);
    await sql`update support_requests set sender_email = null, created_by = ${SYSTEM_ACTOR_ID}`;

    expect(await sendStatusRuns()).toEqual([]);
  });
});

describe('the resolved mail', () => {
  beforeEach(() => {
    vi.stubEnv('MAIL_TRANSPORT', 'smtp');
  });

  it('starts a run when staff resolve the request, and none when the move is refused', async () => {
    const request = await sendSupportRequest(asUser(C), INPUT, mail);
    startJob.mockClear();

    await resolveSupportRequest(asUser(E), request.id, mail);
    expect(statusRuns()).toEqual([
      { kind: 'resolved', requestId: request.id, origin: 'http://localhost:3000' },
    ]);
    const [message] = await sendStatusRuns();
    expect(message!.to).toBe(await emailOf(C.id));
    expect(message!.subject).toContain(INPUT.subject);

    // Precondition: the request is now resolved, so a second resolve is refused by the guarded move.
    await expect(resolveSupportRequest(asUser(E), request.id, mail)).rejects.toThrow();
    expect(statusRuns()).toHaveLength(1);
  });

  it('sends nothing from a run whose request is no longer resolved when its step runs', async () => {
    const request = await sendSupportRequest(asUser(C), INPUT, mail);
    startJob.mockClear();
    await resolveSupportRequest(asUser(E), request.id, mail);
    // Precondition: sent now, the step would mail the sender.
    expect(await sendStatusRuns()).toHaveLength(1);
    await sql`update support_requests set status = 'open' where id = ${request.id}`;

    expect(await sendStatusRuns()).toEqual([]);
  });
});

describe('an internal note', () => {
  it('reaches none of the runs a request starts', async () => {
    vi.stubEnv('MAIL_TRANSPORT', 'smtp');
    const request = await sendSupportRequest(asUser(C), INPUT, mail);
    // Precondition: the note is saved on the request before the mails go.
    await addSupportInternalNote(asUser(E), request.id, NOTE);
    expect(await sql`select 1 from support_replies where body = ${NOTE}`).toHaveLength(1);

    const reply = await replyToSupportRequest(asUser(E), request.id, 'Which jar?', mail);
    await resolveSupportRequest(asUser(E), request.id, mail);

    expect(statusRuns().map((run) => run.kind)).toEqual(['received', 'resolved']);
    const replyRuns = startJob.mock.calls.filter(([job]) => job === supportReplyNotice);
    expect(replyRuns.map(([, args]) => args)).toEqual([[reply.id, 'http://localhost:3000']]);
    expect(JSON.stringify(startJob.mock.calls)).not.toContain('repeat caller');
  });
});

describe('the rendered mails', () => {
  const real = () => supportNotifier(new Request('http://localhost:8000/api/graphql'));
  beforeEach(() => {
    // Unset, so the received and resolved mails are tried once here rather than started as jobs.
    vi.stubEnv('MAIL_TRANSPORT', '');
    sent.length = 0;
  });

  it('carry no internal note text in any of the four mails, signed in', async () => {
    const notifier = real();
    const request = await sendSupportRequest(asUser(C), INPUT, notifier);
    // Precondition: the note is saved on the request, so a leak would have text to carry.
    await addSupportInternalNote(asUser(E), request.id, NOTE);
    expect(await sql`select 1 from support_replies where body = ${NOTE}`).toHaveLength(1);
    const reply = await replyToSupportRequest(asUser(E), request.id, 'Which jar?', notifier);
    expect(await replyNoticeStep(reply.id, 'http://localhost:8000')).toBe(true);
    await resolveSupportRequest(asUser(E), request.id, notifier);
    expect(
      await retentionBatchStep({
        kind: 'notice',
        ids: [request.id],
        now: noticeDay(),
        origin: 'http://localhost:8000',
      }),
    ).toBe(1);

    expect(sent).toHaveLength(4);
    for (const message of sent) {
      expect(message.html).not.toContain('repeat caller');
      expect(message.text).not.toContain('repeat caller');
      expect(message.subject).not.toContain('repeat caller');
    }
  });

  it('link a signed-out sender to nothing behind an account, in every mail they receive', async () => {
    const notifier = real();
    await sendSignedOutSupportRequest(SIGNED_OUT, {
      clientIp: '203.0.113.7',
      notifier,
    } as Parameters<typeof sendSignedOutSupportRequest>[1]);
    const [row] = await sql`select id from support_requests`;
    await addSupportInternalNote(asUser(E), row!.id as string, NOTE);
    const reply = await replyToSupportRequest(
      asUser(E),
      row!.id as string,
      'Use the card.',
      notifier,
    );
    expect(await replyNoticeStep(reply.id, 'http://localhost:8000')).toBe(true);
    await resolveSupportRequest(asUser(E), row!.id as string, notifier);
    expect(
      await retentionBatchStep({
        kind: 'notice',
        ids: [row!.id as string],
        now: noticeDay(),
        origin: 'http://localhost:8000',
      }),
    ).toBe(1);

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
