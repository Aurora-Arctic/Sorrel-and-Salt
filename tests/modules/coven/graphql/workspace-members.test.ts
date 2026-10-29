import { isObjectType } from 'graphql';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { WORKSPACE_W_ID } from '@/db/seed/standard';
import { schema } from '@/graphql/schema';
import { A, B, C, D, E, asUser } from '../../../support/as-user';
import { sql, useRawClient } from '../../../support/db/probe-tables';
import { makeWorkspace, workspaceColumns } from '../../../support/fixtures';
import { run } from '../../../support/graphql/run';

useRawClient();

// The transport's half of `Workspace.members` and `WorkspaceMember.user`
// : a member's name comes through MB.10's `usersById`, one read per
// coven listed however many members it holds, and the refusal
// reaches the wire as `FORBIDDEN`. Who may list a coven's members is the
// service's, in tests/modules/coven/services/members.test.ts.

const repository = vi.hoisted(() => ({
  findCoMemberNamesIncludingSoftDeleted: vi.fn(),
  findMemberEmails: vi.fn(),
}));
vi.mock('@/db/repository', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/db/repository')>();
  repository.findCoMemberNamesIncludingSoftDeleted.mockImplementation(
    actual.findCoMemberNamesIncludingSoftDeleted,
  );
  repository.findMemberEmails.mockImplementation(actual.findMemberEmails);
  return { ...actual, ...repository };
});

beforeEach(() => {
  repository.findCoMemberNamesIncludingSoftDeleted.mockClear();
  repository.findMemberEmails.mockClear();
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

describe('WorkspaceMember.invitedBy', () => {
  const INVITED = /* GraphQL */ `
    query {
      me {
        memberships {
          workspace {
            id
            members(first: 10) {
              edges {
                node {
                  user {
                    id
                    name
                  }
                  invitedBy {
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
  type Invited = {
    me: {
      memberships: {
        workspace: {
          id: string;
          members: {
            edges: {
              node: { user: { id: string; name: string }; invitedBy: { name: string } | null };
            }[];
          };
        };
      }[];
    };
  };
  afterEach(async () => {
    await sql`update workspace_members set invited_by = null where workspace_id = ${WORKSPACE_W_ID}`;
    await sql`delete from workspace_members where workspace_id = ${WORKSPACE_W_ID} and user_id = ${E.id}`;
  });

  const inviterOf = async (userId: string) => {
    const result = await run<Invited>(asUser(A), INVITED);
    expect(result.errors).toBeUndefined();
    const w = result.data!.me.memberships.find(({ workspace }) => workspace.id === WORKSPACE_W_ID)!;
    return w.workspace.members.edges.find(({ node }) => node.user.id === userId)!.node.invitedBy;
  };

  it('names the inviter, and is null for a member nobody invited', async () => {
    await sql`update workspace_members set invited_by = ${A.id} where workspace_id = ${WORKSPACE_W_ID} and user_id = ${B.id}`;
    // The precondition: A, the creator, has no inviter, so null is the column's, not the resolver's.
    expect(await inviterOf(B.id)).toEqual({ name: A.name });
    expect(await inviterOf(A.id)).toBeNull();
  });

  it('still names an inviter who has since been removed', async () => {
    await sql`update workspace_members set invited_by = ${E.id} where workspace_id = ${WORKSPACE_W_ID} and user_id = ${B.id}`;
    // E shares no live coven with A: only the removed seat in W lets the name resolve.
    await sql`insert into workspace_members (workspace_id, user_id, role, deleted_at, deleted_by, created_by, updated_by) values (${WORKSPACE_W_ID}, ${E.id}, 'member', now(), ${A.id}, ${A.id}, ${A.id})`;
    expect(await inviterOf(B.id)).toEqual({ name: E.name });
  });

  it('resolves the inviters with the members in one read per coven', async () => {
    await sql`update workspace_members set invited_by = ${A.id} where workspace_id = ${WORKSPACE_W_ID} and user_id in (${B.id}, ${C.id})`;
    repository.findCoMemberNamesIncludingSoftDeleted.mockClear();
    await run<Invited>(asUser(A), INVITED);
    expect(repository.findCoMemberNamesIncludingSoftDeleted).toHaveBeenCalledTimes(2);
  });
});

describe('WorkspaceMember.user', () => {
  it('carries an id and a display name, and no email address', () => {
    const type = schema.getType('CoMember');
    expect(isObjectType(type)).toBe(true);

    expect(Object.keys(isObjectType(type) ? type.getFields() : {}).sort()).toEqual(['id', 'name']);
  });
});

// The owner-only address: its own field rather than a widened
// `CoMember`, which every member reads. Who may read it is the service's, in
// tests/modules/coven/services/members.test.ts; here, that a refusal reaches
// the wire as FORBIDDEN, and one read per page of members.
describe('WorkspaceMember.email', () => {
  const EMAILS = /* GraphQL */ `
    query {
      me {
        memberships {
          role
          workspace {
            id
            members(first: 10) {
              edges {
                node {
                  user {
                    id
                  }
                  email
                }
              }
            }
          }
        }
      }
    }
  `;
  type Emails = {
    me: {
      memberships: {
        role: string;
        workspace: {
          id: string;
          members: {
            edges: {
              node: { user: { id: string }; email: string | null };
            }[];
          };
        };
      }[];
    };
  };

  it("answers an owner every member's address, one read per coven listed", async () => {
    const result = await run<Emails>(asUser(A), EMAILS);

    expect(result.errors).toBeUndefined();
    const emails = Object.fromEntries(
      result.data!.me.memberships.map(({ workspace }) => [
        workspace.id,
        workspace.members.edges.map(({ node }) => ({ id: node.user.id, email: node.email })),
      ]),
    );
    expect(emails[WORKSPACE_W_ID]).toEqual(
      expect.arrayContaining([
        { id: A.id, email: A.email },
        { id: B.id, email: B.email },
        { id: C.id, email: C.email },
      ]),
    );
    expect(emails[covenY]).toEqual(expect.arrayContaining([{ id: D.id, email: D.email }]));
    // Five members across two covens, and a read per coven, never per member.
    expect(repository.findMemberEmails).toHaveBeenCalledTimes(2);
  });

  it('answers FORBIDDEN, and no address, to a member who is listed the roll', async () => {
    // B in W, and D in X and the second coven, are each a member, which reads
    // the roll: the field is all that is refused. D has no path to W's roll.
    for (const [caller, inW] of [
      [B, true],
      [D, false],
    ] as const) {
      const roll = await run<Rolls>(asUser(caller), ROLLS);
      expect(roll.errors).toBeUndefined();
      const covens = roll.data!.me.memberships.map(({ workspace }) => workspace.id);
      expect(covens.includes(WORKSPACE_W_ID)).toBe(inW);

      const result = await run<Emails>(asUser(caller), EMAILS);

      const memberships = result.data!.me.memberships;
      expect(memberships.map(({ role }) => role)).toEqual(covens.map(() => 'member'));
      const nodes = memberships.flatMap(({ workspace }) =>
        workspace.members.edges.map(({ node }) => node),
      );
      expect(nodes.length).toBeGreaterThan(0);
      expect(nodes.map(({ email }) => email)).toEqual(nodes.map(() => null));
      expect(new Set(result.errors?.map((error) => error.extensions?.code))).toEqual(
        new Set(['FORBIDDEN']),
      );
    }
  });

  it("answers FORBIDDEN to a site admin who reads an owner's covens, and no address", async () => {
    const ADMIN = /* GraphQL */ `
      query ($query: String) {
        users(first: 1, query: $query) {
          edges {
            node {
              memberships {
                workspace {
                  id
                  members(first: 10) {
                    edges {
                      node {
                        email
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    `;
    // Why this could have reached the roll: an admin reads anyone's covens
    // , so E is handed A's W.
    const covens = await run<{
      users: { edges: { node: { memberships: { workspace: { id: string } }[] } }[] };
    }>(
      asUser(E),
      'query ($query: String) { users(first: 1, query: $query) { edges { node { memberships { workspace { id } } } } } }',
      { query: A.email },
    );
    expect(
      covens.data!.users.edges[0].node.memberships.map(({ workspace }) => workspace.id),
    ).toContain(WORKSPACE_W_ID);

    const result = await run(asUser(E), ADMIN, { query: A.email });

    expect(result.errors?.map((error) => error.extensions?.code)).toContain('FORBIDDEN');
    expect(JSON.stringify(result.data)).not.toContain(B.email);
    expect(repository.findMemberEmails).not.toHaveBeenCalled();
  });
});
