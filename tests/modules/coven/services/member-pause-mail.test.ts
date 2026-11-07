import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type postgres from 'postgres';
import { Forbidden, ValidationError } from '@/lib/errors';
import { assertRunArguments } from '@/lib/jobs/run-arguments';
import { longMinuteInZone } from '@/lib/utc';
import { liftMemberAccessPause, pauseMemberAccess } from '@/modules/coven';
import type { MemberPauseMail, MemberPauseNotifier } from '@/modules/coven';
import { memberPauseMail } from '@/modules/coven/jobs/member-pause-mail';
import { memberPauseStep } from '@/modules/coven/jobs/member-pause-mail-steps';
import { A, B, C, asUser } from '../../../support/as-user';
import { failureOf, useTestDatabase } from '../../../support/db/database';
import { makeWorkspace, workspaceColumns } from '../../../support/fixtures';

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
const NOTE = "Owners only: edits other members' spells.";
const MESSAGE = 'Taking a short break from the coven while we talk.';
const notifier: MemberPauseNotifier = { origin: async () => ORIGIN };

let covens = 0;
let covenName: string;
let covenId: string;

const emailOf = async (userId: string) =>
  (await sql`select email from users where id = ${userId}`)[0]!.email as string;

const pausesOf = async (userId: string) =>
  sql`
    select id, message from workspace_member_pauses
     where workspace_id = ${covenId} and user_id = ${userId} order by created_at`;

const pauseRuns = () =>
  startJob.mock.calls
    .filter(([job]) => job === memberPauseMail)
    .map(([, args]) => (args as [MemberPauseMail])[0]);

async function sendPauseRuns() {
  sent.length = 0;
  for (const run of pauseRuns()) await memberPauseStep(run);
  return [...sent];
}

beforeEach(async () => {
  startJob.mockClear();
  send.mockClear();
  sent.length = 0;
  // Set, so a pause starts its job rather than trying the mail once here.
  vi.stubEnv('MAIL_TRANSPORT', 'smtp');
  // A coven per test, each named apart, as a coven's slug is unique.
  covenName = `Fixture Mail Coven ${++covens}`;
  const [row] = await sql`
    insert into workspaces ${sql({ ...workspaceColumns(makeWorkspace({ name: covenName })), created_by: A.id, updated_by: A.id })}
    returning id`;
  covenId = row!.id as string;
  for (const [userId, role] of [
    [A.id, 'owner'],
    [B.id, 'member'],
    [C.id, 'viewer'],
  ] as const) {
    await sql`
      insert into workspace_members (workspace_id, user_id, role, created_by, updated_by)
      values (${covenId}, ${userId}, ${role}, ${A.id}, ${A.id})`;
  }
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('pauseMemberAccess starts the mail', () => {
  it("starts one run holding the pause's id, the kind and the origin, and no address, coven name, note or message", async () => {
    const pause = await pauseMemberAccess(asUser(A), covenId, C.id, UNTIL, NOTE, notifier, MESSAGE);

    expect(pauseRuns()).toEqual([{ kind: 'member-pause', pauseId: pause.id, origin: ORIGIN }]);
    const run = JSON.stringify(pauseRuns());
    expect(run).not.toContain(await emailOf(C.id));
    expect(run).not.toContain(covenName);
    expect(run).not.toContain(NOTE);
    expect(run).not.toContain(MESSAGE);
    expect(() => assertRunArguments(pauseRuns())).not.toThrow();
    expect(send).not.toHaveBeenCalled();
  });

  it('stores the message on the pause, trimmed, and a blank one as none', async () => {
    const first = await pauseMemberAccess(
      asUser(A),
      covenId,
      C.id,
      UNTIL,
      NOTE,
      notifier,
      `  ${MESSAGE}  `,
    );
    await liftMemberAccessPause(asUser(A), covenId, C.id);
    await pauseMemberAccess(asUser(A), covenId, C.id, UNTIL, NOTE, notifier, '   ');

    expect((await pausesOf(C.id)).map((row) => row.message)).toEqual([MESSAGE, null]);
    expect(first.message).toBe(MESSAGE);
  });

  it('refuses a message of 501 characters, writing and starting nothing, and takes one of 500', async () => {
    const error = await failureOf(
      pauseMemberAccess(asUser(A), covenId, C.id, UNTIL, NOTE, notifier, 'm'.repeat(501)),
    );

    expect(error).toBeInstanceOf(ValidationError);
    expect(error).toMatchObject({ issues: [{ path: ['message'] }] });
    expect(await pausesOf(C.id)).toEqual([]);
    expect(pauseRuns()).toEqual([]);

    const row = await pauseMemberAccess(
      asUser(A),
      covenId,
      C.id,
      UNTIL,
      NOTE,
      notifier,
      'm'.repeat(500),
    );
    expect(row.message).toHaveLength(500);
  });
});

describe('pauseMemberAccess starts nothing when it writes nothing', () => {
  it('starts no run when a member, who may not pause anyone, tries', async () => {
    expect(
      await failureOf(pauseMemberAccess(asUser(B), covenId, C.id, UNTIL, NOTE, notifier, MESSAGE)),
    ).toBeInstanceOf(Forbidden);
    expect(pauseRuns()).toEqual([]);
    expect(send).not.toHaveBeenCalled();
    expect(await pausesOf(C.id)).toEqual([]);

    // Why the refusal is the permission check's: the same call from the owner writes the pause and starts its run.
    await pauseMemberAccess(asUser(A), covenId, C.id, UNTIL, NOTE, notifier, MESSAGE);
    expect(pauseRuns()).toHaveLength(1);
  });
});

describe('liftMemberAccessPause', () => {
  it('starts no run and sends nothing', async () => {
    await pauseMemberAccess(asUser(A), covenId, C.id, null, NOTE, notifier);
    // Precondition: setting it started its one run.
    expect(pauseRuns()).toHaveLength(1);

    await liftMemberAccessPause(asUser(A), covenId, C.id);

    expect(pauseRuns()).toHaveLength(1);
    expect(send).not.toHaveBeenCalled();
  });
});

describe('a mail that cannot be started or sent', () => {
  it('is logged when the run cannot be started, tried once here instead, and leaves the pause standing', async () => {
    const logged = vi.spyOn(console, 'error').mockImplementation(() => {});
    startJob.mockRejectedValueOnce(new Error('workflow world down'));

    const row = await pauseMemberAccess(asUser(A), covenId, C.id, UNTIL, NOTE, notifier, MESSAGE);

    expect(row).toMatchObject({ workspaceId: covenId, userId: C.id, until: UNTIL, liftedAt: null });
    expect(await pausesOf(C.id)).toHaveLength(1);
    expect(logged).toHaveBeenCalled();
    expect(sent.map((mail) => mail.to)).toEqual([await emailOf(C.id)]);
  });

  it('is logged when the fallback send fails, never thrown, and leaves the pause standing', async () => {
    vi.stubEnv('MAIL_TRANSPORT', '');
    const logged = vi.spyOn(console, 'error').mockImplementation(() => {});
    send.mockRejectedValueOnce(new Error('mail provider down'));

    const row = await pauseMemberAccess(asUser(A), covenId, C.id, UNTIL, NOTE, notifier, MESSAGE);

    expect(send).toHaveBeenCalledTimes(1);
    expect(row).toMatchObject({ workspaceId: covenId, userId: C.id, liftedAt: null });
    expect(await pausesOf(C.id)).toHaveLength(1);
    expect(logged).toHaveBeenCalled();
  });
});

describe('with MAIL_TRANSPORT unset', () => {
  it('starts no run and sends the one mail through send(), to the member, without the note', async () => {
    vi.stubEnv('MAIL_TRANSPORT', '');

    await pauseMemberAccess(asUser(A), covenId, C.id, UNTIL, NOTE, notifier, MESSAGE);

    expect(pauseRuns()).toEqual([]);
    expect(send).toHaveBeenCalledTimes(1);
    expect(sent[0]!.to).toBe(await emailOf(C.id));
    expect(sent[0]!.text).toContain(MESSAGE);
    expect(`${sent[0]!.text}${sent[0]!.html}`).not.toContain(NOTE);
  });
});

describe("the coven pause mail's step", () => {
  it("mails the member's account address, read when it sends, naming the coven, with the end date and the message and never the note", async () => {
    await pauseMemberAccess(asUser(A), covenId, C.id, UNTIL, NOTE, notifier, MESSAGE);

    const [mail, ...rest] = await sendPauseRuns();

    expect(rest).toEqual([]);
    expect(mail!.to).toBe(await emailOf(C.id));
    expect(mail!.subject).toMatch(/paused/i);
    expect(mail!.subject).toContain(covenName);
    expect(mail!.text).toContain(covenName);
    expect(mail!.text).toContain(`${longMinuteInZone(UNTIL, 'UTC')} UTC`);
    expect(mail!.text).toContain(MESSAGE);
    expect(`${mail!.text}${mail!.html}`).not.toContain(NOTE);
  });

  it('says a pause with no end date has none, and carries no message when none was written, nor a note', async () => {
    await pauseMemberAccess(asUser(A), covenId, C.id, null, null, notifier);

    const [mail] = await sendPauseRuns();

    expect(mail!.text).toContain(covenName);
    expect(mail!.text).toMatch(/no end date/i);
    expect(mail!.text).not.toContain('2099');
    expect(mail!.text).not.toMatch(/null|undefined/);
  });

  it('sends nothing once the pause was lifted after the run started', async () => {
    await pauseMemberAccess(asUser(A), covenId, C.id, UNTIL, NOTE, notifier, MESSAGE);
    // Precondition: run now, the step mails the member.
    expect(await sendPauseRuns()).toHaveLength(1);
    await liftMemberAccessPause(asUser(A), covenId, C.id);

    expect(await sendPauseRuns()).toEqual([]);
    expect(await memberPauseStep(pauseRuns()[0]!)).toBe(false);
  });

  it('sends nothing for a pause that is gone', async () => {
    const gone: MemberPauseMail = {
      kind: 'member-pause',
      pauseId: '00000000-0000-0000-0000-00000000dead',
      origin: ORIGIN,
    };

    expect(await memberPauseStep(gone)).toBe(false);
    expect(sent).toEqual([]);
  });
});
