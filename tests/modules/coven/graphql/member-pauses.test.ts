import { describe, expect, it } from 'vitest';
import { A, B, C, asUser } from '../../../support/as-user';
import { sql, useRawClient } from '../../../support/db/probe-tables';
import { makeWorkspace, workspaceColumns } from '../../../support/fixtures';
import { run } from '../../../support/graphql/run';

useRawClient();

// The transport's half of `Workspace.memberPauses`: one member's pauses, each with who set and lifted it named through
// `usersById`, and the refusal reaching the wire as `FORBIDDEN`. Who may read them is the service's, in
// tests/modules/coven/services/member-pause.test.ts.

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
