import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { memberPauseMail } from '@/modules/coven/jobs/member-pause-mail';
import { A, B, C, asUser } from '../../../support/as-user';
import { sql, useRawClient } from '../../../support/db/probe-tables';
import { makeWorkspace, workspaceColumns } from '../../../support/fixtures';
import { run } from '../../../support/graphql/run';

useRawClient();

const { startJob } = vi.hoisted(() => ({
  startJob: vi.fn(async (..._args: unknown[]) => 'run-id'),
}));
vi.mock('@/lib/jobs', () => ({ startJob }));
vi.mock('@/lib/mail', () => ({ send: async () => {} }));

// The transport's half of `Workspace.memberPauses`: one member's pauses, each with who set and lifted it named through
// `usersById`, and the refusal reaching the wire as `FORBIDDEN`. Who may read them is the service's, in
// tests/modules/coven/services/member-pause.test.ts. The message argument of `pauseMemberAccess` is at the end.

const HISTORY = /* GraphQL */ `
  query ($id: ID!, $userId: ID!) {
    workspace(id: $id) {
      memberPauses(userId: $userId, first: 10) {
        edges {
          node {
            note
            until
            liftedAt
            setBy {
              id
              name
            }
            liftedBy {
              id
              name
            }
          }
        }
      }
    }
  }
`;

type History = {
  workspace: {
    memberPauses: {
      edges: {
        node: {
          note: string | null;
          setBy: { id: string; name: string | null };
          liftedBy: { id: string; name: string | null } | null;
        };
      }[];
    };
  } | null;
};

async function covenWithHistory(name: string): Promise<string> {
  const [row] = await sql`
    insert into workspaces ${sql({ ...workspaceColumns(makeWorkspace({ name })), created_by: A.id, updated_by: A.id })}
    returning id`;
  const id = row.id as string;
  await sql`
    insert into workspace_members (workspace_id, user_id, role, created_by, updated_by)
    values (${id}, ${A.id}, 'owner', ${A.id}, ${A.id}), (${id}, ${B.id}, 'member', ${A.id}, ${A.id}),
           (${id}, ${C.id}, 'viewer', ${A.id}, ${A.id})`;
  await sql`
    insert into workspace_member_pauses (workspace_id, user_id, note, lifted_at, lifted_by, created_at, created_by, updated_by)
    values (${id}, ${C.id}, 'Earlier', now(), ${A.id}, now() - interval '1 day', ${A.id}, ${A.id})`;
  await sql`
    insert into workspace_member_pauses (workspace_id, user_id, note, created_by, updated_by)
    values (${id}, ${C.id}, 'Standing', ${A.id}, ${A.id})`;
  return id;
}

describe('Workspace.memberPauses', () => {
  it("answers an owner one member's pauses, newest first, naming who set and who lifted each", async () => {
    const id = await covenWithHistory('Fixture Pause History');
    const [owner] = await sql`select name from users where id = ${A.id}`;

    const answer = await run<History>(asUser(A), HISTORY, { id, userId: C.id });

    expect(answer.errors).toBeUndefined();
    expect(answer.data?.workspace?.memberPauses.edges.map(({ node }) => node)).toEqual([
      expect.objectContaining({
        note: 'Standing',
        setBy: { id: A.id, name: owner.name },
        liftedBy: null,
      }),
      expect.objectContaining({
        note: 'Earlier',
        setBy: { id: A.id, name: owner.name },
        liftedBy: { id: A.id, name: owner.name },
      }),
    ]);
  });

  it('refuses a member of the coven, who holds no member: pause, as FORBIDDEN', async () => {
    const id = await covenWithHistory('Fixture Pause History Refused');
    // Why it could have answered: B sits in the coven, so `workspace` itself resolves.
    const seat = await run(asUser(B), `query ($id: ID!) { workspace(id: $id) { id } }`, { id });
    expect(seat.errors).toBeUndefined();

    const answer = await run<History>(asUser(B), HISTORY, { id, userId: C.id });

    expect(answer.errors?.[0]?.extensions).toMatchObject({ code: 'FORBIDDEN' });
  });
});

const PAUSE = /* GraphQL */ `
  mutation ($workspaceId: ID!, $userId: ID!, $until: DateTime, $note: String, $message: String) {
    pauseMemberAccess(
      workspaceId: $workspaceId
      userId: $userId
      until: $until
      note: $note
      message: $message
    ) {
      id
    }
  }
`;

type Paused = { pauseMemberAccess: { id: string } | null };

// The message to the member is an optional argument, handed to the service and stored on the pause beside the note. What the
// mail says is tests/modules/coven/services/member-pause-mail.test.ts.
describe('Mutation.pauseMemberAccess', () => {
  beforeEach(() => {
    startJob.mockClear();
    vi.stubEnv('MAIL_TRANSPORT', 'smtp');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('stores the message it is given on the pause, and starts its mail', async () => {
    const id = await covenWithHistory('Fixture Pause Message');
    await sql`update workspace_member_pauses set lifted_at = now(), lifted_by = ${A.id} where workspace_id = ${id}`;

    const answer = await run<Paused>(asUser(A), PAUSE, {
      workspaceId: id,
      userId: C.id,
      until: null,
      note: 'Owners only: a cooling-off pause.',
      message: 'A short break from the coven while we talk.',
    });

    expect(answer.errors).toBeUndefined();
    const pauseId = answer.data?.pauseMemberAccess?.id;
    const [row] =
      await sql`select note, message from workspace_member_pauses where id = ${pauseId ?? null}`;
    expect(row).toEqual({
      note: 'Owners only: a cooling-off pause.',
      message: 'A short break from the coven while we talk.',
    });
    expect(startJob.mock.calls.filter(([job]) => job === memberPauseMail)).toHaveLength(1);
  });

  it('declares the message an optional String, unlike the time-out and the site pause', async () => {
    const answer = await run<{
      __type: { fields: { name: string; args: { name: string; type: object }[] }[] };
    }>(
      asUser(A),
      `{ __type(name: "Mutation") { fields { name args { name type { kind name } } } } }`,
    );

    const field = answer.data?.__type.fields.find(({ name }) => name === 'pauseMemberAccess');
    expect(field?.args.find(({ name }) => name === 'message')?.type).toEqual({
      kind: 'SCALAR',
      name: 'String',
    });
  });

  it('takes a pause with no message, storing none', async () => {
    const id = await covenWithHistory('Fixture Pause No Message');
    await sql`update workspace_member_pauses set lifted_at = now(), lifted_by = ${A.id} where workspace_id = ${id}`;

    const answer = await run<Paused>(asUser(A), PAUSE, {
      workspaceId: id,
      userId: C.id,
      until: null,
    });

    expect(answer.errors).toBeUndefined();
    const [row] = await sql`
      select message from workspace_member_pauses where workspace_id = ${id} and lifted_at is null`;
    expect(row).toEqual({ message: null });
  });
});
