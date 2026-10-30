import { beforeEach, describe, expect, it } from 'vitest';
import { WORKSPACE_W_ID } from '@/db/seed/standard';
import type { InvitationSender } from '@/modules/identity';
import type { Session } from '@/lib/session';
import { A, asUser } from '../../../support/as-user';
import { sql, useRawClient } from '../../../support/db/probe-tables';
import { run } from '../../../support/graphql/run';

useRawClient();

// An account whose address is unverified reaches the email page and the public pages and nothing else, on the API as on the pages.
// The refusal is made once, in `assertMembership`, which every coven-scoped service passes through.

const quietSender: InvitationSender = {
  siteInvitation: async () => {},
  workspaceInvitation: async () => {},
};

const unverified = (): Session => ({ ...asUser(A), emailUnverified: true });

const WORKSPACE = /* GraphQL */ `
  query ($id: ID!) {
    grimoire(workspaceId: $id, first: 1) {
      edges {
        node {
          id
        }
      }
    }
  }
`;

const INVITE = /* GraphQL */ `
  mutation ($workspaceId: ID!, $email: String!, $role: InvitableRole!) {
    createInvitation(workspaceId: $workspaceId, email: $email, role: $role) {
      id
    }
  }
`;

const ME = /* GraphQL */ `
  query {
    me {
      id
    }
  }
`;

beforeEach(async () => {
  await sql`truncate invitations`;
});

describe('an unverified session on the API', () => {
  it('is refused the grimoire of a coven by its id, while the same account verified reads it', async () => {
    const verified = await run(asUser(A), WORKSPACE, { id: WORKSPACE_W_ID });
    expect(verified.errors).toBeUndefined();
    expect(verified.data).toHaveProperty('grimoire.edges');

    const refused = await run(unverified(), WORKSPACE, { id: WORKSPACE_W_ID });
    expect(refused.errors?.[0].extensions?.code).toBe('FORBIDDEN');
    expect(refused.errors?.[0].message).toMatch(/verify/i);
  });

  it('is refused a coven mutation by its id, and writes nothing', async () => {
    const variables = { workspaceId: WORKSPACE_W_ID, email: 'x@unverified.test', role: 'viewer' };

    const refused = await run(unverified(), INVITE, variables);
    expect(refused.errors?.[0].extensions?.code).toBe('FORBIDDEN');
    expect(await sql`select id from invitations`).toEqual([]);

    // The precondition: A is the coven's owner, and verified the same call lands.
    const verified = await run(asUser(A), INVITE, variables, { invitations: quietSender });
    expect(verified.errors).toBeUndefined();
  });

  it('still reads its own account', async () => {
    const answer = await run(unverified(), ME);
    expect(answer.errors).toBeUndefined();
    expect(answer.data).toMatchObject({ me: { id: A.id } });
  });
});
