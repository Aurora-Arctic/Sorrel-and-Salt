import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type postgres from 'postgres';
import { Forbidden } from '@/lib/errors';
import { liftMemberAccessPause, pauseMemberAccess } from '@/modules/coven';
import type { MemberPauseNotifier } from '@/modules/coven';
import { A, B, C, asUser } from '../../../support/as-user';
import { failureOf, useTestDatabase } from '../../../support/db/database';
import { makeWorkspace, workspaceColumns } from '../../../support/fixtures';

// The mail a coven access pause sends the member: once, after the pause is saved, never on a refused write or a lift, and a
// failed send leaves the pause standing. What the mail says is tests/emails/pause-notices.test.tsx.

const sent = vi.hoisted(() => [] as { to: string; subject: string }[]);

vi.mock('@/lib/mail', () => ({
  send: async (message: (typeof sent)[number]) => {
    sent.push(message);
  },
}));

let sql: postgres.Sql;
useTestDatabase((client) => {
  sql = client;
});

const UNTIL = new Date('2099-03-14T12:00:00Z');
let covens = 0;
let covenName: string;

let covenId: string;

const emailOf = async (userId: string) =>
  (await sql`select email from users where id = ${userId}`)[0]!.email as string;

const standingCount = async (userId: string) =>
  (
    await sql`
      select count(*)::int as count from workspace_member_pauses
       where workspace_id = ${covenId} and user_id = ${userId} and lifted_at is null`
  )[0]!.count as number;

/** A notifier that records each call and, through the raw client, whether the pause was already committed when it ran. */
function recorder(answer: () => Promise<void> = async () => {}) {
  const calls: { args: unknown[]; committed: number }[] = [];
  const notifier: MemberPauseNotifier = {
    memberPaused: vi.fn(async (...args: unknown[]) => {
      calls.push({ args, committed: await standingCount(C.id) });
      return answer();
    }),
  };
  return { notifier, calls };
}

beforeEach(async () => {
  sent.length = 0;
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
  vi.restoreAllMocks();
});

describe('pauseMemberAccess mails the member', () => {
  it("mails the member's account address with the coven's name, the end date and the note, once the pause is committed", async () => {
    const { notifier, calls } = recorder();

    await pauseMemberAccess(asUser(A), covenId, C.id, UNTIL, '  Cooling off  ', notifier);

    expect(calls).toEqual([
      {
        args: [await emailOf(C.id), { covenName, until: UNTIL, note: 'Cooling off' }],
        committed: 1,
      },
    ]);
  });

  it('mails a pause with no end date and no note as one with neither', async () => {
    const { notifier, calls } = recorder();

    await pauseMemberAccess(asUser(A), covenId, C.id, null, null, notifier);

    expect(calls.map((call) => call.args)).toEqual([
      [await emailOf(C.id), { covenName, until: null, note: null }],
    ]);
  });
});

describe('pauseMemberAccess sends nothing when it writes nothing', () => {
  it('mails nothing when a member, who may not pause anyone, tries', async () => {
    const { notifier } = recorder();

    expect(
      await failureOf(pauseMemberAccess(asUser(B), covenId, C.id, UNTIL, 'Cooling off', notifier)),
    ).toBeInstanceOf(Forbidden);
    expect(notifier.memberPaused).not.toHaveBeenCalled();
    expect(await standingCount(C.id)).toBe(0);

    // Why the refusal is the permission check's: the same call from the owner writes the pause and mails.
    await pauseMemberAccess(asUser(A), covenId, C.id, UNTIL, 'Cooling off', notifier);
    expect(notifier.memberPaused).toHaveBeenCalledTimes(1);
  });
});

describe('a failed coven access pause mail', () => {
  it('is logged, never thrown, and leaves the pause standing', async () => {
    const logged = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { notifier } = recorder(() => Promise.reject(new Error('mail provider down')));

    const row = await pauseMemberAccess(asUser(A), covenId, C.id, UNTIL, 'Cooling off', notifier);

    expect(notifier.memberPaused).toHaveBeenCalledTimes(1);
    expect(row).toMatchObject({ workspaceId: covenId, userId: C.id, until: UNTIL, liftedAt: null });
    expect(await standingCount(C.id)).toBe(1);
    expect(logged).toHaveBeenCalled();
  });
});

describe('liftMemberAccessPause', () => {
  it('mails nothing', async () => {
    const { notifier } = recorder();
    await pauseMemberAccess(asUser(A), covenId, C.id, null, 'Cooling off', notifier);

    await liftMemberAccessPause(asUser(A), covenId, C.id);

    expect(notifier.memberPaused).toHaveBeenCalledTimes(1);
    expect(sent).toEqual([]);
  });
});
