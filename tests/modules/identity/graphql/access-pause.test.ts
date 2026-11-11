import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { accessPauseMail } from '@/modules/identity/jobs/access-pause-mail';
import { C, E, asUser } from '../../../support/as-user';
import { sql, useRawClient } from '../../../support/db/probe-tables';
import { run } from '../../../support/graphql/run';

useRawClient();

// The transport's half of `pauseUserAccess`: the message to the user is a required argument, handed to the service and stored
// on the pause beside the note. What the mail says, and who may pause, is the service's
// (tests/modules/identity/services/access-pause-mail.test.ts).

const { startJob } = vi.hoisted(() => ({
  startJob: vi.fn(async (..._args: unknown[]) => 'run-id'),
}));
vi.mock('@/lib/jobs', () => ({ startJob }));
vi.mock('@/lib/mail', () => import('../../../support/mail'));

const PAUSE = /* GraphQL */ `
  mutation ($userId: ID!, $until: DateTime, $note: String!, $message: String!) {
    pauseUserAccess(userId: $userId, until: $until, note: $note, message: $message) {
      id
    }
  }
`;

const WITHOUT_MESSAGE = /* GraphQL */ `
  mutation ($userId: ID!, $note: String!) {
    pauseUserAccess(userId: $userId, note: $note) {
      id
    }
  }
`;

type Arg = {
  name: string;
  type: { kind: string; name: string | null; ofType: { name: string } | null };
};

const ARGUMENTS = /* GraphQL */ `
  {
    __type(name: "Mutation") {
      fields {
        name
        args {
          name
          type {
            kind
            name
            ofType {
              name
            }
          }
        }
      }
    }
  }
`;

type Paused = { pauseUserAccess: { id: string } | null };

beforeEach(async () => {
  startJob.mockClear();
  await sql`truncate user_access_pauses`;
  // A primary keeper who is none of the fixture users, so pausing C is refused by nothing here.
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

  it('declares the message a required String', async () => {
    const answer = await run<{ __type: { fields: { name: string; args: Arg[] }[] } }>(
      asUser(E),
      ARGUMENTS,
    );

    const field = answer.data?.__type.fields.find(({ name }) => name === 'pauseUserAccess');
    expect(field?.args.find(({ name }) => name === 'message')?.type).toEqual({
      kind: 'NON_NULL',
      name: null,
      ofType: { name: 'String' },
    });
  });

  it('refuses a pause sent with no message, writing and starting nothing', async () => {
    const answer = await run<Paused>(asUser(E), WITHOUT_MESSAGE, {
      userId: C.id,
      note: 'Staff only: shared the account.',
    });

    expect(answer.errors?.length).toBeGreaterThan(0);
    expect(answer.data?.pauseUserAccess ?? null).toBeNull();
    expect(await sql`select id from user_access_pauses where user_id = ${C.id}`).toEqual([]);
    expect(startJob.mock.calls.filter(([job]) => job === accessPauseMail)).toEqual([]);

    // Why it could have been written: the same pause with a message is set.
    const sent = await run<Paused>(asUser(E), PAUSE, {
      userId: C.id,
      until: null,
      note: 'x',
      message: 'A message.',
    });
    expect(sent.errors).toBeUndefined();
    expect(await sql`select id from user_access_pauses where user_id = ${C.id}`).toHaveLength(1);
  });
});
