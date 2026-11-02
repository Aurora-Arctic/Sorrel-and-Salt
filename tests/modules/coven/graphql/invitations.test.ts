import { createHash } from 'node:crypto';
import { beforeEach, describe, expect, it } from 'vitest';
import type { InvitationSender } from '@/modules/identity';
import { WORKSPACE_W_ID } from '@/db/seed/standard';
import { A, B, asUser } from '../../../support/as-user';
import { sql, useRawClient } from '../../../support/db/probe-tables';
import { run } from '../../../support/graphql/run';
import type { CreateInvitationResult } from './types';

useRawClient();

// The transport's half of `createInvitation`: the answer is the invitation, with its coven and role and never the link or the token, the session is the actor, and a refusal reaches the wire as its code.
// Who may invite, which roles and which addresses are tests/modules/coven/services/invitations.test.ts's.

const INVITED = 'invited@coven-invitations-graphql.test';

const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');

/** A sender that records what it was asked to mail, so a test holds the token the inbox would. */
function recordingSender() {
  const sent: { to: string; token: string; role: string; name: string; inviterName: string }[] = [];
  const sender: InvitationSender = {
    siteInvitation: async () => {
      throw new Error('a coven invitation mails no admin');
    },
    workspaceInvitation: async (to, token, { name, role, inviterName }) => {
      sent.push({ to, token, role, name, inviterName });
    },
  };
  return { sent, sender };
}

const CREATE = /* GraphQL */ `
  mutation ($workspaceId: ID!, $email: String!, $role: InvitableRole!) {
    createInvitation(workspaceId: $workspaceId, email: $email, role: $role) {
      id
      email
      role
      workspace {
        id
      }
      audit {
        createdBy
      }
    }
  }
`;

beforeEach(async () => {
  await sql`truncate card_invitation_attempts, invitations`;
});

describe('Mutation.createInvitation', () => {
  it('answers an owner the invitation, stamped as the session, and the link only to the sender', async () => {
    const { sent, sender } = recordingSender();

    const result = await run<CreateInvitationResult>(
      asUser(A),
      CREATE,
      { workspaceId: WORKSPACE_W_ID, email: INVITED, role: 'member' },
      { invitations: sender },
    );

    expect(result.errors).toBeUndefined();
    expect(result.data?.createInvitation).toMatchObject({
      email: INVITED,
      role: 'member',
      workspace: { id: WORKSPACE_W_ID },
      audit: { createdBy: A.id },
    });
    expect(sent).toEqual([
      {
        to: INVITED,
        token: expect.any(String),
        role: 'member',
        name: expect.any(String),
        // The acting owner's own name, read from their row.
        inviterName: (await sql`select name from users where id = ${A.id}`)[0].name,
      },
    ]);
    const [{ token }] = sent;
    expect(JSON.stringify(result)).not.toContain(token);
    expect(JSON.stringify(result)).not.toContain(sha256(token));
  });

  // The schema's enum has no owner, so the query is invalid before any service runs.
  it('refuses owner as the role before the service is reached, writing and mailing nothing', async () => {
    const { sent, sender } = recordingSender();

    const result = await run(
      asUser(A),
      CREATE,
      { workspaceId: WORKSPACE_W_ID, email: INVITED, role: 'owner' },
      { invitations: sender },
    );

    expect(result.errors).toHaveLength(1);
    expect(sent).toEqual([]);
    expect(await sql`select 1 from invitations`).toHaveLength(0);
  });

  it('answers a member as FORBIDDEN, who does belong to the coven', async () => {
    const { sent, sender } = recordingSender();

    const result = await run(
      asUser(B),
      CREATE,
      { workspaceId: WORKSPACE_W_ID, email: INVITED, role: 'viewer' },
      { invitations: sender },
    );

    expect(result.errors?.[0]).toMatchObject({ extensions: { code: 'FORBIDDEN' } });
    expect(sent).toEqual([]);
  });

  it('answers a malformed address as VALIDATION on the email', async () => {
    const result = await run(asUser(A), CREATE, {
      workspaceId: WORKSPACE_W_ID,
      email: 'not-an-address',
      role: 'viewer',
    });

    expect(result.errors?.[0]).toMatchObject({
      extensions: { code: 'VALIDATION', fieldErrors: [{ path: ['email'] }] },
    });
  });
});

const REVOKE = /* GraphQL */ `
  mutation ($workspaceId: ID!, $id: ID!) {
    revokeInvitation(workspaceId: $workspaceId, id: $id) {
      id
      revokedAt
      acceptedAt
    }
  }
`;

/** A pending (or accepted) invitation into W, through the raw client. */
async function insertInvitation(accepted = false): Promise<string> {
  const [row] = await sql`
    insert into invitations (email, token_hash, workspace_id, role, created_by, updated_by, expires_at,
      accepted_at, accepted_by)
    values (${INVITED}, ${`hash-${accepted}`}, ${WORKSPACE_W_ID}, 'member', ${A.id}, ${A.id},
      now() + interval '7 days', ${accepted ? sql`now()` : null}, ${accepted ? B.id : null})
    returning id`;
  return row.id as string;
}

describe('Mutation.revokeInvitation', () => {
  it('stamps an owner’s pending invitation revoked, and keeps the row', async () => {
    const id = await insertInvitation();

    const result = await run<{ revokeInvitation: { id: string; revokedAt: string | null } }>(
      asUser(A),
      REVOKE,
      { workspaceId: WORKSPACE_W_ID, id },
    );

    expect(result.errors).toBeUndefined();
    expect(result.data?.revokeInvitation).toMatchObject({ id, revokedAt: expect.any(String) });
    expect(
      await sql`select 1 from invitations where id = ${id} and revoked_at is not null`,
    ).toHaveLength(1);
  });

  it('answers a member as FORBIDDEN and an accepted invitation as VALIDATION on id', async () => {
    const pending = await insertInvitation();
    const accepted = await insertInvitation(true);

    const refused = await run(asUser(B), REVOKE, { workspaceId: WORKSPACE_W_ID, id: pending });
    const joined = await run(asUser(A), REVOKE, { workspaceId: WORKSPACE_W_ID, id: accepted });

    expect(refused.errors?.[0]).toMatchObject({ extensions: { code: 'FORBIDDEN' } });
    expect(joined.errors?.[0]).toMatchObject({
      extensions: { code: 'VALIDATION', fieldErrors: [{ path: ['id'] }] },
    });
    expect(await sql`select 1 from invitations where revoked_at is not null`).toHaveLength(0);
  });

  it('answers a missing id as NOT_FOUND, and a signed-out caller with an error', async () => {
    const missing = await run(asUser(A), REVOKE, {
      workspaceId: WORKSPACE_W_ID,
      id: '00000000-0000-4000-8000-000000000000',
    });
    const signedOut = await run(null, REVOKE, {
      workspaceId: WORKSPACE_W_ID,
      id: '00000000-0000-4000-8000-000000000000',
    });

    expect(missing.errors?.[0]).toMatchObject({ extensions: { code: 'NOT_FOUND' } });
    expect(signedOut.errors).toHaveLength(1);
  });
});
