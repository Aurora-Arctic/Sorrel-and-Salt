import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { supportTimeoutMail } from '@/modules/support/jobs/support-timeout-mail';
import { C, E, asUser } from '../../../support/as-user';
import { sql, useRawClient } from '../../../support/db/probe-tables';
import { run } from '../../../support/graphql/run';

useRawClient();

// The transport's half of `timeOutSupportSender`: the message to the user is a required argument, handed to the service and
// stored on the time-out beside the note. What the mail says, and who may set one, is the service's
// (tests/modules/support/services/timeout-mail.test.ts).

const { startJob } = vi.hoisted(() => ({
  startJob: vi.fn(async (..._args: unknown[]) => 'run-id'),
}));
vi.mock('@/lib/jobs', () => ({ startJob }));
vi.mock('@/lib/mail', () => ({ send: async () => {} }));

const TIME_OUT = /* GraphQL */ `
  mutation ($userId: ID!, $until: DateTime, $note: String!, $message: String!) {
    timeOutSupportSender(userId: $userId, until: $until, note: $note, message: $message) {
      id
    }
  }
`;

const WITHOUT_MESSAGE = /* GraphQL */ `
  mutation ($userId: ID!, $note: String!) {
    timeOutSupportSender(userId: $userId, note: $note) {
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

  it('declares the message a required String', async () => {
    const answer = await run<{ __type: { fields: { name: string; args: Arg[] }[] } }>(
      asUser(E),
      ARGUMENTS,
    );

    const field = answer.data?.__type.fields.find(({ name }) => name === 'timeOutSupportSender');
    expect(field?.args.find(({ name }) => name === 'message')?.type).toEqual({
      kind: 'NON_NULL',
      name: null,
      ofType: { name: 'String' },
    });
  });

  it('refuses a time-out sent with no message, writing and starting nothing', async () => {
    const answer = await run<TimedOut>(asUser(E), WITHOUT_MESSAGE, {
      userId: C.id,
      note: 'Staff only: a repeat caller.',
    });

    expect(answer.errors?.length).toBeGreaterThan(0);
    expect(answer.data?.timeOutSupportSender ?? null).toBeNull();
    expect(await sql`select id from support_timeouts where user_id = ${C.id}`).toEqual([]);
    expect(startJob.mock.calls.filter(([job]) => job === supportTimeoutMail)).toEqual([]);

    // Why it could have been written: the same time-out with a message is set.
    const sent = await run<TimedOut>(asUser(E), TIME_OUT, {
      userId: C.id,
      until: null,
      note: 'x',
      message: 'A message.',
    });
    expect(sent.errors).toBeUndefined();
    expect(await sql`select id from support_timeouts where user_id = ${C.id}`).toHaveLength(1);
  });
});
