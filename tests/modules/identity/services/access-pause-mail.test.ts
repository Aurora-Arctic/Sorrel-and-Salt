import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type postgres from 'postgres';
import { Forbidden } from '@/lib/errors';
import { liftUserAccessPause, pauseUserAccess } from '@/modules/identity';
import type { AccessPauseNotifier } from '@/modules/identity';
import { A, E, F, asUser } from '../../../support/as-user';
import { failureOf, useTestDatabase } from '../../../support/db/database';

// The mail a site access pause sends its user: once, after the pause is saved, never on a refused write or a lift, and a
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

const emailOf = async (userId: string) =>
  (await sql`select email from users where id = ${userId}`)[0]!.email as string;

const standingCount = async (userId: string) =>
  (
    await sql`
      select count(*)::int as count from user_access_pauses where user_id = ${userId} and lifted_at is null`
  )[0]!.count as number;

/** A notifier that records each call and, through the raw client, whether the pause was already committed when it ran. */
function recorder(answer: () => Promise<void> = async () => {}) {
  const calls: { args: unknown[]; committed: number }[] = [];
  const notifier: AccessPauseNotifier = {
    accessPaused: vi.fn(async (...args: unknown[]) => {
      calls.push({ args, committed: await standingCount(A.id) });
      return answer();
    }),
  };
  return { notifier, calls };
}

beforeEach(async () => {
  sent.length = 0;
  await sql`truncate user_access_pauses`;
  // A primary admin who is none of the fixture users, so pausing A is refused by nothing but the role check.
  vi.stubEnv('ADMIN_BOOTSTRAP_EMAIL', 'nobody@access-pause-mail.test');
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('pauseUserAccess mails the user', () => {
  it("mails the user's account address with the end date and the note, once the pause is committed", async () => {
    const { notifier, calls } = recorder();

    await pauseUserAccess(asUser(E), A.id, UNTIL, '  Testnote  ', notifier);

    expect(calls).toEqual([
      { args: [await emailOf(A.id), { until: UNTIL, note: 'Testnote' }], committed: 1 },
    ]);
  });

  it('mails a pause with no end date as one with none', async () => {
    const { notifier, calls } = recorder();

    await pauseUserAccess(asUser(E), A.id, null, 'Testnote', notifier);

    expect(calls.map((call) => call.args)).toEqual([
      [await emailOf(A.id), { until: null, note: 'Testnote' }],
    ]);
  });
});

describe('pauseUserAccess sends nothing when it writes nothing', () => {
  it('mails nothing when a curator, who may not pause anyone, tries', async () => {
    const { notifier } = recorder();

    expect(
      await failureOf(pauseUserAccess(asUser(F), A.id, UNTIL, 'Testnote', notifier)),
    ).toBeInstanceOf(Forbidden);
    expect(notifier.accessPaused).not.toHaveBeenCalled();
    expect(await standingCount(A.id)).toBe(0);

    // Why the refusal is the role check's: the same call from an admin writes the pause and mails.
    await pauseUserAccess(asUser(E), A.id, UNTIL, 'Testnote', notifier);
    expect(notifier.accessPaused).toHaveBeenCalledTimes(1);
  });
});

describe('a failed access pause mail', () => {
  it('is logged, never thrown, and leaves the pause standing', async () => {
    const logged = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { notifier } = recorder(() => Promise.reject(new Error('mail provider down')));

    const row = await pauseUserAccess(asUser(E), A.id, UNTIL, 'Testnote', notifier);

    expect(notifier.accessPaused).toHaveBeenCalledTimes(1);
    expect(row).toMatchObject({ userId: A.id, until: UNTIL, note: 'Testnote', liftedAt: null });
    expect(await standingCount(A.id)).toBe(1);
    expect(logged).toHaveBeenCalled();
  });
});

describe('liftUserAccessPause', () => {
  it('mails nothing', async () => {
    const { notifier } = recorder();
    await pauseUserAccess(asUser(E), A.id, null, 'Testnote', notifier);

    await liftUserAccessPause(asUser(E), A.id);

    expect(notifier.accessPaused).toHaveBeenCalledTimes(1);
    expect(sent).toEqual([]);
  });
});
