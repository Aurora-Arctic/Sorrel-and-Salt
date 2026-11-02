import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { accessPauseMail } from '@/modules/identity/jobs/access-pause-mail';
import { C, E, asUser } from '../../../support/as-user';
import { sql, useRawClient } from '../../../support/db/probe-tables';
import { run } from '../../../support/graphql/run';

useRawClient();

// The transport's half of `pauseUserAccess`: the message to the user is an optional argument, handed to the service and stored
// on the pause beside the note. What the mail says, and who may pause, is the service's
// (tests/modules/identity/services/access-pause-mail.test.ts).

const { startJob } = vi.hoisted(() => ({
  startJob: vi.fn(async (..._args: unknown[]) => 'run-id'),
}));
vi.mock('@/lib/jobs', () => ({ startJob }));
vi.mock('@/lib/mail', () => ({ send: async () => {} }));

const PAUSE = /* GraphQL */ `
  mutation ($userId: ID!, $until: DateTime, $note: String!, $message: String) {
    pauseUserAccess(userId: $userId, until: $until, note: $note, message: $message) {
      id
    }
  }
`;

type Paused = { pauseUserAccess: { id: string } | null };

beforeEach(async () => {
  startJob.mockClear();
  await sql`truncate user_access_pauses`;
  // A primary admin who is none of the fixture users, so pausing C is refused by nothing here.
  vi.stubEnv('ADMIN_BOOTSTRAP_EMAIL', 'nobody@access-pause-graphql.test');
  vi.stubEnv('MAIL_TRANSPORT', 'smtp');
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('Mutation.pauseUserAccess', () => {
  it('stores the message it is given on the pause, and starts its mail', async () => {
    const answer = await run<Paused>(asUser(E), PAUSE, {
      userId: C.id,
      until: null,
      note: 'Staff only: shared the account.',
      message: 'Your access is paused while we look into a report.',
    });

    expect(answer.errors).toBeUndefined();
    const id = answer.data?.pauseUserAccess?.id;
    const [row] = await sql`select note, message from user_access_pauses where id = ${id ?? null}`;
    expect(row).toEqual({
      note: 'Staff only: shared the account.',
      message: 'Your access is paused while we look into a report.',
    });
    expect(startJob.mock.calls.filter(([job]) => job === accessPauseMail)).toHaveLength(1);
  });

  it('takes a pause with no message, storing none', async () => {
    const answer = await run<Paused>(asUser(E), PAUSE, {
      userId: C.id,
      until: null,
      note: 'Staff only: shared the account.',
    });

    expect(answer.errors).toBeUndefined();
    const [row] = await sql`select message from user_access_pauses where user_id = ${C.id}`;
    expect(row).toEqual({ message: null });
  });
});
