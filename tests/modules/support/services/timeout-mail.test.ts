import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type postgres from 'postgres';
import { Forbidden, ValidationError } from '@/lib/errors';
import { assertRunArguments } from '@/lib/jobs/run-arguments';
import { longMinuteInZone } from '@/lib/utc';
import { liftSupportTimeout, timeOutSupportSender } from '@/modules/support';
import type { SupportTimeoutMail, TimeoutNotifier } from '@/modules/support';
import { supportTimeoutMail } from '@/modules/support/jobs/support-timeout-mail';
import { supportTimeoutStep } from '@/modules/support/jobs/support-timeout-mail-steps';
import { C, E, F, asUser } from '../../../support/as-user';
import { failureOf, useTestDatabase } from '../../../support/db/database';

// The mail a support time-out sends its user. Setting one starts a run holding the time-out's id, the kind and the origin alone;
// the run's step reads the user and the time-out when it sends, and sends nothing once the time-out is lifted. The note is for
// staff and reaches no mail; the message to the user does. What the template says is tests/emails/pause-notices.test.tsx.

type Mail = { to: string; subject: string; text: string; html: string };
const { sent, startJob, send } = vi.hoisted(() => {
  const sent = [] as { to: string; subject: string; text: string; html: string }[];
  return {
    sent,
    startJob: vi.fn(async (..._args: unknown[]) => 'run-id'),
    send: vi.fn(async (message: (typeof sent)[number]) => {
      sent.push(message);
    }),
  };
});
vi.mock('@/lib/jobs', () => ({ startJob }));
vi.mock('@/lib/mail', () => ({ send }));
vi.mock('@/lib/mail-transport', () => ({
  deliver: async (message: Mail) => {
    sent.push(message);
    return true;
  },
}));

let sql: postgres.Sql;
useTestDatabase((client) => {
  sql = client;
});

const ORIGIN = 'http://localhost:3000';
const UNTIL = new Date('2099-03-14T12:00:00Z');
const NOTE = 'Staff only: a repeat caller.';
const MESSAGE = 'Please keep each request to one problem.';
const notifier: TimeoutNotifier = { origin: async () => ORIGIN };

const emailOf = async (userId: string) =>
  (await sql`select email from users where id = ${userId}`)[0]!.email as string;

const timeoutsOf = async (userId: string) =>
  sql`select id, message from support_timeouts where user_id = ${userId} order by created_at`;

/** The time-out mail runs started so far, each run's one argument. */
const timeoutRuns = () =>
  startJob.mock.calls
    .filter(([job]) => job === supportTimeoutMail)
    .map(([, args]) => (args as [SupportTimeoutMail])[0]);

/** Runs each started run's step, as the job would, and returns the mails the transport took. */
async function sendTimeoutRuns() {
  sent.length = 0;
  for (const run of timeoutRuns()) await supportTimeoutStep(run);
  return [...sent];
}

beforeEach(async () => {
  startJob.mockClear();
  send.mockClear();
  sent.length = 0;
  await sql`truncate support_timeouts`;
  // Set, so a time-out starts its job rather than trying the mail once here.
  vi.stubEnv('MAIL_TRANSPORT', 'smtp');
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('timeOutSupportSender starts the mail', () => {
  it("starts one run holding the time-out's id, the kind and the origin, and no address, note or message", async () => {
    const timeout = await timeOutSupportSender(asUser(E), C.id, UNTIL, NOTE, notifier, MESSAGE);

    expect(timeoutRuns()).toEqual([
      { kind: 'support-time-out', timeoutId: timeout.id, origin: ORIGIN },
    ]);
    const run = JSON.stringify(timeoutRuns());
    expect(run).not.toContain(await emailOf(C.id));
    expect(run).not.toContain(NOTE);
    expect(run).not.toContain(MESSAGE);
    expect(() => assertRunArguments(timeoutRuns())).not.toThrow();
    expect(send).not.toHaveBeenCalled();
  });

  it('stores the message on the time-out, trimmed', async () => {
    const row = await timeOutSupportSender(
      asUser(E),
      C.id,
      UNTIL,
      NOTE,
      notifier,
      `  ${MESSAGE}  `,
    );

    expect((await timeoutsOf(C.id)).map((stored) => stored.message)).toEqual([MESSAGE]);
    expect(row.message).toBe(MESSAGE);
  });

  it.each([
    ['missing', undefined],
    ['empty', ''],
    ['only spaces', '   '],
  ])('refuses a time-out whose message is %s, writing and starting nothing', async (_, message) => {
    const error = await failureOf(
      timeOutSupportSender(asUser(E), C.id, UNTIL, NOTE, notifier, message as string),
    );

    expect(error).toBeInstanceOf(ValidationError);
    expect(error).toMatchObject({ issues: [{ path: ['message'] }] });
    expect(await timeoutsOf(C.id)).toEqual([]);
    expect(timeoutRuns()).toEqual([]);

    // Why it could have been written: the same call with a message sets the time-out and starts its mail.
    await timeOutSupportSender(asUser(E), C.id, UNTIL, NOTE, notifier, MESSAGE);
    expect(await timeoutsOf(C.id)).toHaveLength(1);
    expect(timeoutRuns()).toHaveLength(1);
  });

  it('refuses a message of 501 characters, writing and starting nothing, and takes one of 500', async () => {
    const error = await failureOf(
      timeOutSupportSender(asUser(E), C.id, UNTIL, NOTE, notifier, 'm'.repeat(501)),
    );

    expect(error).toBeInstanceOf(ValidationError);
    expect(error).toMatchObject({ issues: [{ path: ['message'] }] });
    expect(await timeoutsOf(C.id)).toEqual([]);
    expect(timeoutRuns()).toEqual([]);

    const row = await timeOutSupportSender(asUser(E), C.id, UNTIL, NOTE, notifier, 'm'.repeat(500));
    expect(row.message).toHaveLength(500);
  });
});

describe('timeOutSupportSender starts nothing when it writes nothing', () => {
  it('starts no run when a curator, who may not time anyone out, tries', async () => {
    expect(
      await failureOf(timeOutSupportSender(asUser(F), C.id, UNTIL, NOTE, notifier, MESSAGE)),
    ).toBeInstanceOf(Forbidden);
    expect(timeoutRuns()).toEqual([]);
    expect(send).not.toHaveBeenCalled();
    expect(await timeoutsOf(C.id)).toEqual([]);

    // Why the refusal is the role check's: the same call from an admin writes the time-out and starts its run.
    await timeOutSupportSender(asUser(E), C.id, UNTIL, NOTE, notifier, MESSAGE);
    expect(timeoutRuns()).toHaveLength(1);
  });
});

describe('liftSupportTimeout', () => {
  it('starts no run and sends nothing', async () => {
    const timeout = await timeOutSupportSender(asUser(E), C.id, null, NOTE, notifier, MESSAGE);
    // Precondition: setting it started its one run.
    expect(timeoutRuns()).toHaveLength(1);

    await liftSupportTimeout(asUser(E), timeout.id);

    expect(timeoutRuns()).toHaveLength(1);
    expect(send).not.toHaveBeenCalled();
  });
});

describe('a mail that cannot be started or sent', () => {
  it('is logged when the run cannot be started, tried once here instead, and leaves the time-out standing', async () => {
    const logged = vi.spyOn(console, 'error').mockImplementation(() => {});
    startJob.mockRejectedValueOnce(new Error('workflow world down'));

    const row = await timeOutSupportSender(asUser(E), C.id, UNTIL, NOTE, notifier, MESSAGE);

    expect(row).toMatchObject({ userId: C.id, until: UNTIL, liftedAt: null });
    expect(await timeoutsOf(C.id)).toHaveLength(1);
    expect(logged).toHaveBeenCalled();
    expect(sent.map((mail) => mail.to)).toEqual([await emailOf(C.id)]);
  });

  it('is logged when the fallback send fails, never thrown, and leaves the time-out standing', async () => {
    vi.stubEnv('MAIL_TRANSPORT', '');
    const logged = vi.spyOn(console, 'error').mockImplementation(() => {});
    send.mockRejectedValueOnce(new Error('mail provider down'));

    const row = await timeOutSupportSender(asUser(E), C.id, UNTIL, NOTE, notifier, MESSAGE);

    expect(send).toHaveBeenCalledTimes(1);
    expect(row).toMatchObject({ userId: C.id, liftedAt: null });
    expect(await timeoutsOf(C.id)).toHaveLength(1);
    expect(logged).toHaveBeenCalled();
  });
});

describe('with MAIL_TRANSPORT unset', () => {
  it('starts no run and sends the one mail through send(), to the user, without the note', async () => {
    vi.stubEnv('MAIL_TRANSPORT', '');

    await timeOutSupportSender(asUser(E), C.id, UNTIL, NOTE, notifier, MESSAGE);

    expect(timeoutRuns()).toEqual([]);
    expect(send).toHaveBeenCalledTimes(1);
    expect(sent[0]!.to).toBe(await emailOf(C.id));
    expect(sent[0]!.text).toContain(MESSAGE);
    expect(`${sent[0]!.text}${sent[0]!.html}`).not.toContain(NOTE);
  });
});

describe("the time-out mail's step", () => {
  it("mails the user's account address, read when it sends, with the end date and the message and never the note", async () => {
    await timeOutSupportSender(asUser(E), C.id, UNTIL, NOTE, notifier, MESSAGE);

    const [mail, ...rest] = await sendTimeoutRuns();

    expect(rest).toEqual([]);
    expect(mail!.to).toBe(await emailOf(C.id));
    expect(mail!.subject).toMatch(/support/i);
    expect(mail!.subject).toMatch(/timed out|time-out/i);
    expect(mail!.text).toContain(`${longMinuteInZone(UNTIL, 'UTC')} UTC`);
    expect(mail!.text).toContain(MESSAGE);
    expect(`${mail!.text}${mail!.html}`).not.toContain(NOTE);
  });

  it('says a time-out with no end date has none', async () => {
    await timeOutSupportSender(asUser(E), C.id, null, NOTE, notifier, MESSAGE);

    const [mail] = await sendTimeoutRuns();

    expect(mail!.text).toMatch(/no end date/i);
    expect(mail!.text).not.toContain('2099');
    expect(mail!.text).not.toMatch(/null|undefined/);
    expect(`${mail!.text}${mail!.html}`).not.toContain(NOTE);
  });

  it('sends nothing once the time-out was lifted after the run started', async () => {
    const timeout = await timeOutSupportSender(asUser(E), C.id, UNTIL, NOTE, notifier, MESSAGE);
    // Precondition: run now, the step mails the user.
    expect(await sendTimeoutRuns()).toHaveLength(1);
    await liftSupportTimeout(asUser(E), timeout.id);

    expect(await sendTimeoutRuns()).toEqual([]);
    expect(await supportTimeoutStep(timeoutRuns()[0]!)).toBe(false);
  });

  it('sends nothing for a time-out that is gone', async () => {
    const gone: SupportTimeoutMail = {
      kind: 'support-time-out',
      timeoutId: '00000000-0000-0000-0000-00000000dead',
      origin: ORIGIN,
    };

    expect(await supportTimeoutStep(gone)).toBe(false);
    expect(sent).toEqual([]);
  });
});
