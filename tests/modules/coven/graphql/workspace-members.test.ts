import { isObjectType } from 'graphql';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { WORKSPACE_W_ID } from '@/db/seed/standard';
import { schema } from '@/graphql/schema';
import { A, B, C, D, asUser } from '../../../support/as-user';
import { sql, useRawClient } from '../../../support/db/probe-tables';
import { makeWorkspace, workspaceColumns } from '../../../support/fixtures';
import { run } from '../../../support/graphql/run';

useRawClient();

// The transport's half of `Workspace.members` and `WorkspaceMember.user`
// (M6.11): a member's name comes through MB.10's `usersById`, one read per
// coven listed however many members it holds, and the refusal
// reaches the wire as `FORBIDDEN`. Who may list a coven's members is the
// service's, in tests/modules/coven/services/members.test.ts.

const repository = vi.hoisted(() => ({ findCoMemberNamesIncludingSoftDeleted: vi.fn() }));
vi.mock('@/db/repository', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/db/repository')>();
  repository.findCoMemberNamesIncludingSoftDeleted.mockImplementation(
    actual.findCoMemberNamesIncludingSoftDeleted,
  );
  return { ...actual, ...repository };
});

beforeEach(() => {
  repository.findCoMemberNamesIncludingSoftDeleted.mockClear();
});

// Run below the route's depth limit, as every resolver test is: through `me`,
// a member's name sits eight levels down, one past it.
const ROLLS = /* GraphQL */ `
  query {
    me {
      memberships {
        workspace {
          id
          members(first: 10) {
            edges {
              node {
                role
                user {
                  id
                  name
                }
              }
            }
          }
        }
      }
    }
  }
`;

type Rolls = {
  me: {
    memberships: {
      workspace: {
        id: string;
        members: { edges: { node: { role: string; user: { id: string; name: string } } }[] };
      };
    }[];
  };
};

let covenY: string;

beforeAll(async () => {
  // A second coven A owns, holding D, who shares nothing with A in W.
  const [row] = await sql`
    insert into workspaces ${sql({ ...workspaceColumns(makeWorkspace({ name: 'Fixture Second Coven' })), created_by: A.id, updated_by: A.id })}
    returning id`;
  covenY = row.id as string;
  for (const [userId, role] of [
    [A.id, 'owner'],
    [D.id, 'member'],
  ]) {
    await sql`
      insert into workspace_members (workspace_id, user_id, role, created_by, updated_by)
      values (${covenY}, ${userId}, ${role}, ${A.id}, ${A.id})`;
  }
});

describe('Workspace.members', () => {
  it('names every member of every coven listed, one read of the names per coven', async () => {
    const result = await run<Rolls>(asUser(A), ROLLS);

    expect(result.errors).toBeUndefined();
    const rolls = Object.fromEntries(
      result.data!.me.memberships.map(({ workspace }) => [
        workspace.id,
        workspace.members.edges.map(({ node }) => ({ id: node.user.id, name: node.user.name })),
      ]),
    );
    expect(rolls[WORKSPACE_W_ID]).toEqual(
      expect.arrayContaining([
        { id: A.id, name: A.name },
        { id: B.id, name: B.name },
        { id: C.id, name: C.name },
      ]),
    );
    expect(rolls[covenY]).toEqual(
      expect.arrayContaining([
        { id: A.id, name: A.name },
        { id: D.id, name: D.name },
      ]),
    );
    // Five members across two covens, and a read of the names per coven, never
    // per member: each coven's page resolves on its own tick, so the loader
    // batches one page's members, not two covens' (no N+1).
    expect(repository.findCoMemberNamesIncludingSoftDeleted).toHaveBeenCalledTimes(2);
  });

  it('answers FORBIDDEN to a viewer, who does sit in the coven', async () => {
    const roles = await run<{ me: { memberships: { role: string; workspace: { id: string } }[] } }>(
      asUser(C),
      'query { me { memberships { role workspace { id } } } }',
    );
    expect(roles.data!.me.memberships).toEqual([
      { role: 'viewer', workspace: { id: WORKSPACE_W_ID } },
    ]);

    const result = await run(asUser(C), ROLLS);

    expect(result.errors?.map((error) => error.extensions?.code)).toEqual(['FORBIDDEN']);
  });
});

describe('WorkspaceMember.user', () => {
  it('carries an id and a display name, and no email address', () => {
    const type = schema.getType('CoMember');
    expect(isObjectType(type)).toBe(true);

    expect(Object.keys(isObjectType(type) ? type.getFields() : {}).sort()).toEqual(['id', 'name']);
  });
});
