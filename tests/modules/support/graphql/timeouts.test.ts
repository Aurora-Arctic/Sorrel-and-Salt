import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { supportTimeoutMail } from '@/modules/support/jobs/support-timeout-mail';
import { C, E, asUser } from '../../../support/as-user';
import { sql, useRawClient } from '../../../support/db/probe-tables';
import { run } from '../../../support/graphql/run';

useRawClient();

// The transport's half of `timeOutSupportSender`: the message to the user is an optional argument, handed to the service and
// stored on the time-out beside the note. What the mail says, and who may set one, is the service's
// (tests/modules/support/services/timeout-mail.test.ts).

const { startJob } = vi.hoisted(() => ({
  startJob: vi.fn(async (..._args: unknown[]) => 'run-id'),
}));
vi.mock('@/lib/jobs', () => ({ startJob }));
vi.mock('@/lib/mail', () => ({ send: async () => {} }));

const TIME_OUT = /* GraphQL */ `
  mutation ($userId: ID!, $until: DateTime, $note: String!, $message: String) {
    timeOutSupportSender(userId: $userId, until: $until, note: $note, message: $message) {
      id
    }
  }
`;

type TimedOut = { timeOutSupportSender: { id: string } | null };

beforeEach(async () => {
  startJob.mockClear();
  await sql`truncate support_timeouts`;
  vi.stubEnv('MAIL_TRANSPORT', 'smtp');
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('Mutation.timeOutSupportSender', () => {
  it('stores the message it is given on the time-out, and starts its mail', async () => {
    const answer = await run<TimedOut>(asUser(E), TIME_OUT, {
      userId: C.id,
      until: null,
      note: 'Staff only: a repeat caller.',
      message: 'Please keep each request to one problem.',
    });

    expect(answer.errors).toBeUndefined();
    const id = answer.data?.timeOutSupportSender?.id;
    const [row] = await sql`select note, message from support_timeouts where id = ${id ?? null}`;
    expect(row).toEqual({
      note: 'Staff only: a repeat caller.',
      message: 'Please keep each request to one problem.',
    });
    expect(startJob.mock.calls.filter(([job]) => job === supportTimeoutMail)).toHaveLength(1);
  });

  it('takes a time-out with no message, storing none', async () => {
    const answer = await run<TimedOut>(asUser(E), TIME_OUT, {
      userId: C.id,
      until: null,
      note: 'Staff only: a repeat caller.',
    });

    expect(answer.errors).toBeUndefined();
    const [row] = await sql`select message from support_timeouts where user_id = ${C.id}`;
    expect(row).toEqual({ message: null });
  });
});
