import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type postgres from 'postgres';
import { Forbidden, ValidationError } from '@/lib/errors';
import { assertRunArguments } from '@/lib/jobs/run-arguments';
import { longMinuteInZone } from '@/lib/utc';
import { liftUserAccessPause, pauseUserAccess } from '@/modules/identity';
import type { AccessPauseMail, AccessPauseNotifier } from '@/modules/identity';
import { accessPauseMail } from '@/modules/identity/jobs/access-pause-mail';
import { accessPauseStep } from '@/modules/identity/jobs/access-pause-mail-steps';
import { A, E, F, asUser } from '../../../support/as-user';
import { failureOf, useTestDatabase } from '../../../support/db/database';

// The mail a site access pause sends its user. Setting one starts a run holding the pause's id, the kind and the origin alone;
// the run's step reads the user and the pause when it sends, and sends nothing once the pause is lifted or gone. The note is
// for staff and reaches no mail; the message to the user does. What the template says is tests/emails/pause-notices.test.tsx.

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
const NOTE = 'Staff only: shared the account.';
const MESSAGE = 'Your access is paused while we look into a report.';
const notifier: AccessPauseNotifier = { origin: async () => ORIGIN };

const emailOf = async (userId: string) =>
  (await sql`select email from users where id = ${userId}`)[0]!.email as string;

const pausesOf = async (userId: string) =>
  sql`select id, message from user_access_pauses where user_id = ${userId} order by created_at`;

/** The access pause mail runs started so far, each run's one argument. */
const pauseRuns = () =>
  startJob.mock.calls
    .filter(([job]) => job === accessPauseMail)
    .map(([, args]) => (args as [AccessPauseMail])[0]);

/** Runs each started run's step, as the job would, and returns the mails the transport took. */
async function sendPauseRuns() {
  sent.length = 0;
  for (const run of pauseRuns()) await accessPauseStep(run);
  return [...sent];
}

beforeEach(async () => {
  startJob.mockClear();
  send.mockClear();
  sent.length = 0;
  await sql`truncate user_access_pauses`;
  // A primary keeper who is none of the fixture users, so pausing A is refused by nothing but the role check.
  vi.stubEnv('ADMIN_BOOTSTRAP_EMAIL', 'nobody@access-pause-mail.test');
  // Set, so a pause starts its job rather than trying the mail once here.
  vi.stubEnv('MAIL_TRANSPORT', 'smtp');
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('pauseUserAccess starts the mail', () => {
  it("starts one run holding the pause's id, the kind and the origin, and no address, note or message", async () => {
    const pause = await pauseUserAccess(asUser(E), A.id, UNTIL, NOTE, notifier, MESSAGE);

    expect(pauseRuns()).toEqual([{ kind: 'access-pause', pauseId: pause.id, origin: ORIGIN }]);
    const run = JSON.stringify(pauseRuns());
    expect(run).not.toContain(await emailOf(A.id));
    expect(run).not.toContain(NOTE);
    expect(run).not.toContain(MESSAGE);
    expect(() => assertRunArguments(pauseRuns())).not.toThrow();
    expect(send).not.toHaveBeenCalled();
  });

  it('stores the message on the pause, trimmed', async () => {
    const row = await pauseUserAccess(asUser(E), A.id, UNTIL, NOTE, notifier, `  ${MESSAGE}  `);

    expect((await pausesOf(A.id)).map((stored) => stored.message)).toEqual([MESSAGE]);
    expect(row.message).toBe(MESSAGE);
  });

  it.each([
    ['missing', undefined],
    ['empty', ''],
    ['only spaces', '   '],
  ])('refuses a pause whose message is %s, writing and starting nothing', async (_, message) => {
    const error = await failureOf(
      pauseUserAccess(asUser(E), A.id, UNTIL, NOTE, notifier, message as string),
    );

    expect(error).toBeInstanceOf(ValidationError);
    expect(error).toMatchObject({ issues: [{ path: ['message'] }] });
    expect(await pausesOf(A.id)).toEqual([]);
    expect(pauseRuns()).toEqual([]);

    // Why it could have been written: the same call with a message sets the pause and starts its mail.
    await pauseUserAccess(asUser(E), A.id, UNTIL, NOTE, notifier, MESSAGE);
    expect(await pausesOf(A.id)).toHaveLength(1);
    expect(pauseRuns()).toHaveLength(1);
  });

  it('refuses a message of 501 characters, writing and starting nothing, and takes one of 500', async () => {
    const error = await failureOf(
      pauseUserAccess(asUser(E), A.id, UNTIL, NOTE, notifier, 'm'.repeat(501)),
    );

    expect(error).toBeInstanceOf(ValidationError);
    expect(error).toMatchObject({ issues: [{ path: ['message'] }] });
    expect(await pausesOf(A.id)).toEqual([]);
    expect(pauseRuns()).toEqual([]);

    const row = await pauseUserAccess(asUser(E), A.id, UNTIL, NOTE, notifier, 'm'.repeat(500));
    expect(row.message).toHaveLength(500);
  });
});

describe('pauseUserAccess starts nothing when it writes nothing', () => {
  it('starts no run when a curator, who may not pause anyone, tries', async () => {
    expect(
      await failureOf(pauseUserAccess(asUser(F), A.id, UNTIL, NOTE, notifier, MESSAGE)),
    ).toBeInstanceOf(Forbidden);
    expect(pauseRuns()).toEqual([]);
    expect(send).not.toHaveBeenCalled();
    expect(await pausesOf(A.id)).toEqual([]);

    // Why the refusal is the role check's: the same call from a keeper writes the pause and starts its run.
    await pauseUserAccess(asUser(E), A.id, UNTIL, NOTE, notifier, MESSAGE);
    expect(pauseRuns()).toHaveLength(1);
  });
});

describe('liftUserAccessPause', () => {
  it('starts no run and sends nothing', async () => {
    await pauseUserAccess(asUser(E), A.id, null, NOTE, notifier, MESSAGE);
    // Precondition: setting it started its one run.
    expect(pauseRuns()).toHaveLength(1);

    await liftUserAccessPause(asUser(E), A.id);

    expect(pauseRuns()).toHaveLength(1);
    expect(send).not.toHaveBeenCalled();
  });
});

describe('a mail that cannot be started or sent', () => {
  it('is logged when the run cannot be started, tried once here instead, and leaves the pause standing', async () => {
    const logged = vi.spyOn(console, 'error').mockImplementation(() => {});
    startJob.mockRejectedValueOnce(new Error('workflow world down'));

    const row = await pauseUserAccess(asUser(E), A.id, UNTIL, NOTE, notifier, MESSAGE);

    expect(row).toMatchObject({ userId: A.id, until: UNTIL, liftedAt: null });
    expect(await pausesOf(A.id)).toHaveLength(1);
    expect(logged).toHaveBeenCalled();
    expect(sent.map((mail) => mail.to)).toEqual([await emailOf(A.id)]);
  });

  it('is logged when the fallback send fails, never thrown, and leaves the pause standing', async () => {
    vi.stubEnv('MAIL_TRANSPORT', '');
    const logged = vi.spyOn(console, 'error').mockImplementation(() => {});
    send.mockRejectedValueOnce(new Error('mail provider down'));

    const row = await pauseUserAccess(asUser(E), A.id, UNTIL, NOTE, notifier, MESSAGE);

    expect(send).toHaveBeenCalledTimes(1);
    expect(row).toMatchObject({ userId: A.id, liftedAt: null });
    expect(await pausesOf(A.id)).toHaveLength(1);
    expect(logged).toHaveBeenCalled();
  });
});

describe('with MAIL_TRANSPORT unset', () => {
  it('starts no run and sends the one mail through send(), to the user, without the note', async () => {
    vi.stubEnv('MAIL_TRANSPORT', '');

    await pauseUserAccess(asUser(E), A.id, UNTIL, NOTE, notifier, MESSAGE);

    expect(pauseRuns()).toEqual([]);
    expect(send).toHaveBeenCalledTimes(1);
    expect(sent[0]!.to).toBe(await emailOf(A.id));
    expect(sent[0]!.text).toContain(MESSAGE);
    expect(`${sent[0]!.text}${sent[0]!.html}`).not.toContain(NOTE);
  });
});

describe("the access pause mail's step", () => {
  it("mails the user's account address, read when it sends, with the end date, the message and the support page, and never the note", async () => {
    await pauseUserAccess(asUser(E), A.id, UNTIL, NOTE, notifier, MESSAGE);

    const [mail, ...rest] = await sendPauseRuns();

    expect(rest).toEqual([]);
    expect(mail!.to).toBe(await emailOf(A.id));
    expect(mail!.subject).toMatch(/paused/i);
    expect(mail!.text).toContain(`${longMinuteInZone(UNTIL, 'UTC')} UTC`);
    expect(mail!.text).toContain(MESSAGE);
    expect(mail!.text).toContain(`${ORIGIN}/support`);
    expect(`${mail!.text}${mail!.html}`).not.toContain(NOTE);
  });

  it('says a pause with no end date has none', async () => {
    await pauseUserAccess(asUser(E), A.id, null, NOTE, notifier, MESSAGE);

    const [mail] = await sendPauseRuns();

    expect(mail!.text).toMatch(/no end date/i);
    expect(mail!.text).not.toContain('2099');
    expect(mail!.text).not.toMatch(/null|undefined/);
    expect(`${mail!.text}${mail!.html}`).not.toContain(NOTE);
  });

  it('sends nothing once the pause was lifted after the run started', async () => {
    await pauseUserAccess(asUser(E), A.id, UNTIL, NOTE, notifier, MESSAGE);
    // Precondition: run now, the step mails the user.
    expect(await sendPauseRuns()).toHaveLength(1);
    await liftUserAccessPause(asUser(E), A.id);

    expect(await sendPauseRuns()).toEqual([]);
    expect(await accessPauseStep(pauseRuns()[0]!)).toBe(false);
  });

  it('sends nothing for a pause that is gone', async () => {
    const gone: AccessPauseMail = {
      kind: 'access-pause',
      pauseId: '00000000-0000-0000-0000-00000000dead',
      origin: ORIGIN,
    };

    expect(await accessPauseStep(gone)).toBe(false);
    expect(sent).toEqual([]);
  });
});
