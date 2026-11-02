import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type postgres from 'postgres';
import { Forbidden } from '@/lib/errors';
import { liftSupportTimeout, timeOutSupportSender } from '@/modules/support';
import type { TimeoutNotifier } from '@/modules/support';
import { C, E, F, asUser } from '../../../support/as-user';
import { failureOf, useTestDatabase } from '../../../support/db/database';

// The mail a support time-out sends its user: once, after the time-out is saved, never on a refused write or a lift, and a
// failed send leaves the time-out standing. What the mail says is tests/emails/pause-notices.test.tsx.

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

const timeoutCount = async (userId: string) =>
  (await sql`select count(*)::int as count from support_timeouts where user_id = ${userId}`)[0]!
    .count as number;

/** A notifier that records each call and, through the raw client, whether the time-out was already committed when it ran. */
function recorder(answer: () => Promise<void> = async () => {}) {
  const calls: { args: unknown[]; committed: number }[] = [];
  const notifier: TimeoutNotifier = {
    timedOut: vi.fn(async (...args: unknown[]) => {
      calls.push({ args, committed: await timeoutCount(C.id) });
      return answer();
    }),
  };
  return { notifier, calls };
}

beforeEach(async () => {
  sent.length = 0;
  await sql`truncate support_timeouts`;
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('timeOutSupportSender mails the user', () => {
  it("mails the user's account address with the end date and the note, once the time-out is committed", async () => {
    const { notifier, calls } = recorder();

    await timeOutSupportSender(asUser(E), C.id, UNTIL, '  Spam  ', notifier);

    expect(calls).toEqual([
      { args: [await emailOf(C.id), { until: UNTIL, note: 'Spam' }], committed: 1 },
    ]);
  });

  it('mails a time-out with no end date as one with none', async () => {
    const { notifier, calls } = recorder();

    await timeOutSupportSender(asUser(E), C.id, null, 'Spam', notifier);

    expect(calls.map((call) => call.args)).toEqual([
      [await emailOf(C.id), { until: null, note: 'Spam' }],
    ]);
  });
});

describe('timeOutSupportSender sends nothing when it writes nothing', () => {
  it('mails nothing when a curator, who may not time anyone out, tries', async () => {
    const { notifier } = recorder();

    expect(
      await failureOf(timeOutSupportSender(asUser(F), C.id, UNTIL, 'Spam', notifier)),
    ).toBeInstanceOf(Forbidden);
    expect(notifier.timedOut).not.toHaveBeenCalled();
    expect(await timeoutCount(C.id)).toBe(0);

    // Why the refusal is the role check's: the same call from an admin writes the time-out and mails.
    await timeOutSupportSender(asUser(E), C.id, UNTIL, 'Spam', notifier);
    expect(notifier.timedOut).toHaveBeenCalledTimes(1);
  });
});

describe('a failed time-out mail', () => {
  it('is logged, never thrown, and leaves the time-out standing', async () => {
    const logged = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { notifier } = recorder(() => Promise.reject(new Error('mail provider down')));

    const row = await timeOutSupportSender(asUser(E), C.id, UNTIL, 'Spam', notifier);

    expect(notifier.timedOut).toHaveBeenCalledTimes(1);
    expect(row).toMatchObject({ userId: C.id, until: UNTIL, note: 'Spam', liftedAt: null });
    expect(await timeoutCount(C.id)).toBe(1);
    expect(logged).toHaveBeenCalled();
  });
});

describe('liftSupportTimeout', () => {
  it('mails nothing', async () => {
    const { notifier } = recorder();
    const timeout = await timeOutSupportSender(asUser(E), C.id, null, 'Spam', notifier);

    await liftSupportTimeout(asUser(E), timeout.id);

    expect(notifier.timedOut).toHaveBeenCalledTimes(1);
    expect(sent).toEqual([]);
  });
});
