import { createHash } from 'node:crypto';
import { isObjectType } from 'graphql';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import postgres from 'postgres';
import { schema } from '@/graphql/schema';
import type { InvitationSender } from '@/modules/identity';
import { A, E, asUser } from '../../../support/as-user';
import { asManualFix } from '../../../support/db/privileges';
import { run } from '../../../support/graphql/run';
import { WORKSPACE_W_ID } from '@/db/seed/standard';
import type {
  AcceptInvitationByIdResult,
  AcceptInvitationResult,
  CreateAdminInvitationResult,
  DeclineInvitationByIdResult,
} from './types';

// The three mutations, the transport's half
// (claude-docs/testing/layer-ownership.md): an admin's answer, which carries
// no token and no link, the session as the actor, and one refusal per error
// code, read as the browser reads them. Which callers, addresses and links the
// services refuse is services/admin-invitations.test.ts's and
// services/invitation-acceptance-by-token.test.ts's; a signed-out caller and the scope
// are tests/db/graphql-query-scopes.test.ts's.

let sql: ReturnType<typeof postgres>;

beforeAll(() => {
  sql = postgres(process.env.DATABASE_URL as string, { onnotice: () => {} });
});

afterAll(async () => {
  await sql.end();
});

const DOMAIN = '@admin-invitations-graphql.test';
const GRANTEE = '00000000-0000-0000-0000-0000000000f1';
const INVITED = `grantee${DOMAIN}`;

const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');

/** A sender that records what it was asked to mail, so a test holds the token the inbox would. */
function recordingSender() {
  const sent: { to: string; token: string; inviterName: string }[] = [];
  const sender: InvitationSender = {
    siteInvitation: async (to, token, { inviterName }) => {
      sent.push({ to, token, inviterName });
    },
    workspaceInvitation: async () => {
      throw new Error('an admin invitation mails no coven');
    },
  };
  return { sent, sender };
}

beforeEach(async () => {
  await sql`truncate invitations`;
  await sql`truncate admin_role_change_pauses`;
  await sql`truncate user_privilege_changes`;
  await sql`delete from workspace_members where user_id = ${GRANTEE}`;
  await sql`delete from users where email like ${`%${DOMAIN}`}`;
  await asManualFix(sql, async (tx) => {
    await tx`
      insert into users (id, name, email, email_verified, created_by, updated_by)
      values (${GRANTEE}, 'Grantee Fixturewort', ${INVITED}, true, ${GRANTEE}, ${GRANTEE})
    `;
  });
  // E is the seed's admin; the variable names it the primary admin here.
  vi.stubEnv('ADMIN_BOOTSTRAP_EMAIL', E.email);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

const CREATE = `
  mutation ($email: String!, $siteRole: InvitableSiteRole = admin, $note: String) {
    createAdminInvitation(email: $email, siteRole: $siteRole, note: $note) {
      id email siteRole note expiresAt audit { createdBy }
    }
  }
`;

const ACCEPT = `mutation ($token: String!) { acceptInvitation(token: $token) { id acceptedAt } }`;

describe('Mutation.createAdminInvitation', () => {
  it('answers an admin the invitation, stamped as the session, and the link only to the sender', async () => {
    const { sent, sender } = recordingSender();

    const result = await run<CreateAdminInvitationResult>(
      asUser(E),
      CREATE,
      { email: INVITED, note: 'Curates the resins' },
      { invitations: sender },
    );

    expect(result.errors).toBeUndefined();
    expect(result.data?.createAdminInvitation).toMatchObject({
      email: INVITED,
      siteRole: 'admin',
      note: 'Curates the resins',
      audit: { createdBy: E.id },
    });
    expect(sent).toEqual([
      {
        to: INVITED,
        token: expect.any(String),
        // The acting admin's own name, read from their row.
        inviterName: (await sql`select name from users where id = ${E.id}`)[0].name,
      },
    ]);
    const [{ token }] = sent;
    expect(JSON.stringify(result)).not.toContain(token);
    expect(JSON.stringify(result)).not.toContain(sha256(token));
  });

  // Not merely absent from this answer: no field could carry them.
  it('has no field that could carry the token, its hash or a link', () => {
    const type = schema.getType('Invitation');
    if (!isObjectType(type)) throw new Error('Invitation is not an object type');
    const fields = Object.keys(type.getFields());

    expect(fields.sort()).toEqual([
      'acceptedAt',
      'audit',
      'declinedAt',
      'email',
      'expiresAt',
      'id',
      'note',
      'revokedAt',
      'role',
      'siteRole',
      'workspace',
    ]);
  });

  // The role is the admin's choice, and the transport carries it through.
  it('answers the curator role it was asked to invite to', async () => {
    const { sender } = recordingSender();

    const result = await run<CreateAdminInvitationResult>(
      asUser(E),
      CREATE,
      { email: INVITED, siteRole: 'curator' },
      { invitations: sender },
    );

    expect(result.errors).toBeUndefined();
    expect(result.data?.createAdminInvitation).toMatchObject({ siteRole: 'curator' });
  });

  it('refuses the user role, which no invitation grants, before the service is reached', async () => {
    const { sent, sender } = recordingSender();

    const result = await run(
      asUser(E),
      CREATE,
      { email: INVITED, siteRole: 'user' },
      { invitations: sender },
    );

    expect(result.errors).toHaveLength(1);
    expect(result.data).toBeUndefined();
    expect(sent).toEqual([]);
  });

  it('answers a malformed address as VALIDATION on the email', async () => {
    const result = await run(asUser(E), CREATE, { email: 'not-an-address' });

    expect(result.errors?.[0]).toMatchObject({
      extensions: {
        code: 'VALIDATION',
        fieldErrors: [{ path: ['email'] }],
      },
    });
  });
});

describe('Mutation.revokeAdminInvitation', () => {
  it('answers an admin the invitation withdrawn, and an id naming none as NOT_FOUND', async () => {
    const { sender } = recordingSender();
    const created = await run<CreateAdminInvitationResult>(
      asUser(E),
      CREATE,
      { email: INVITED },
      { invitations: sender },
    );
    const id = created.data?.createAdminInvitation.id;

    const revoked = await run(asUser(E), `mutation { revokeAdminInvitation(id: "${id}") { id } }`);
    expect(revoked).toEqual({ data: { revokeAdminInvitation: { id } } });

    const again = await run(asUser(E), `mutation { revokeAdminInvitation(id: "${id}") { id } }`);
    expect(again.errors?.[0]).toMatchObject({ extensions: { code: 'NOT_FOUND' } });
  });
});

describe('Mutation.acceptInvitation', () => {
  it('answers the invited account the invitation accepted, and a second use as FORBIDDEN', async () => {
    const { sent, sender } = recordingSender();
    await run(asUser(E), CREATE, { email: INVITED }, { invitations: sender });
    const [{ token }] = sent;
    const [{ id }] = await sql`select id from invitations`;
    const grantee = { id: GRANTEE, role: 'user' as const };

    const accepted = await run<AcceptInvitationResult>(asUser(grantee), ACCEPT, { token });
    expect(accepted.errors).toBeUndefined();
    expect(accepted.data?.acceptInvitation).toEqual({ id, acceptedAt: expect.any(String) });

    const again = await run(asUser(grantee), ACCEPT, { token });
    expect(again.errors?.[0]).toMatchObject({ extensions: { code: 'FORBIDDEN' } });
  });

  it('answers a token naming none as NOT_FOUND', async () => {
    const result = await run(asUser(E), ACCEPT, { token: 'no-such-token' });

    expect(result.errors?.[0]).toMatchObject({ extensions: { code: 'NOT_FOUND' } });
  });
});

const ACCEPT_BY_ID = `mutation ($id: ID!) { acceptInvitationById(id: $id) { id acceptedAt } }`;

// The transport's half: the answer, and one error code per refusal. Whose
// address admits, and every dead state, are
// services/invitation-acceptance-by-token.test.ts's.
describe('Mutation.acceptInvitationById', () => {
  const grantee = { id: GRANTEE, role: 'user' as const };
  const stranger = { id: '00000000-0000-0000-0000-0000000000f2', role: 'user' as const };

  /** A coven invitation into W for the grantee's address, from A. */
  async function inviteGrantee(expired = false) {
    const [{ id }] = await sql`
      insert into invitations (email, token_hash, workspace_id, role, created_by, updated_by, expires_at)
      values (${INVITED}, ${sha256(expired ? 'expired-token' : 'pending-token')}, ${WORKSPACE_W_ID}, 'viewer',
        ${A.id}, ${A.id}, ${expired ? sql`now() - interval '1 second'` : sql`now() + interval '7 days'`})
      returning id
    `;
    return id as string;
  }

  beforeEach(async () => {
    await sql`update workspaces set deleted_at = null, deleted_by = null where id = ${WORKSPACE_W_ID}`;
    await asManualFix(sql, async (tx) => {
      await tx`
        insert into users (id, name, email, email_verified, created_by, updated_by)
        values (${stranger.id}, 'Stranger Fixturewort', ${`stranger${DOMAIN}`}, true, ${stranger.id}, ${stranger.id})
      `;
    });
  });

  it('answers the invited account the invitation accepted, seating it', async () => {
    const id = await inviteGrantee();

    const accepted = await run<AcceptInvitationByIdResult>(asUser(grantee), ACCEPT_BY_ID, { id });

    expect(accepted.errors).toBeUndefined();
    expect(accepted.data?.acceptInvitationById).toEqual({ id, acceptedAt: expect.any(String) });
    expect(
      await sql`select role::text from workspace_members where workspace_id = ${WORKSPACE_W_ID} and user_id = ${GRANTEE}`,
    ).toMatchObject([{ role: 'viewer' }]);
  });

  it('answers NOT_FOUND for another account’s id, which its owner then accepts', async () => {
    const id = await inviteGrantee();

    const refused = await run(asUser(stranger), ACCEPT_BY_ID, { id });

    expect(refused.errors?.[0]).toMatchObject({ extensions: { code: 'NOT_FOUND' } });
    expect(
      (await sql`select accepted_at from invitations where id = ${id}`)[0]!.accepted_at,
    ).toBeNull();
    const accepted = await run(asUser(grantee), ACCEPT_BY_ID, { id });
    expect(accepted.errors).toBeUndefined();
  });

  it('answers FORBIDDEN for the account’s own expired invitation', async () => {
    const id = await inviteGrantee(true);

    const refused = await run(asUser(grantee), ACCEPT_BY_ID, { id });

    expect(refused.errors?.[0]).toMatchObject({ extensions: { code: 'FORBIDDEN' } });
  });
});

const DECLINE_BY_ID = `mutation ($id: ID!) { declineInvitationById(id: $id) { id declinedAt acceptedAt } }`;

// The transport's half: the answer, `Invitation.declinedAt`, and one
// error code per refusal. Whose address admits, and every dead state, are
// services/invitation-acceptance-by-token.test.ts's.
describe('Mutation.declineInvitationById', () => {
  const grantee = { id: GRANTEE, role: 'user' as const };
  const stranger = { id: '00000000-0000-0000-0000-0000000000f2', role: 'user' as const };

  /** A pending coven invitation into W for the grantee's address, from A. */
  async function inviteGrantee(token = 'pending-token') {
    const [{ id }] = await sql`
      insert into invitations (email, token_hash, workspace_id, role, created_by, updated_by)
      values (${INVITED}, ${sha256(token)}, ${WORKSPACE_W_ID}, 'viewer', ${A.id}, ${A.id})
      returning id
    `;
    return id as string;
  }
  const declinedAtOf = async (id: string) =>
    (await sql`select declined_at from invitations where id = ${id}`)[0]!
      .declined_at as Date | null;

  beforeEach(async () => {
    await sql`update workspaces set deleted_at = null, deleted_by = null where id = ${WORKSPACE_W_ID}`;
    await asManualFix(sql, async (tx) => {
      await tx`
        insert into users (id, name, email, email_verified, created_by, updated_by)
        values (${stranger.id}, 'Stranger Fixturewort', ${`stranger${DOMAIN}`}, true, ${stranger.id}, ${stranger.id})
      `;
    });
  });

  it('answers the invited account the invitation declined, with when, seating no one', async () => {
    const id = await inviteGrantee();
    expect(await declinedAtOf(id)).toBeNull();

    const declined = await run<DeclineInvitationByIdResult>(asUser(grantee), DECLINE_BY_ID, {
      id,
    });

    expect(declined.errors).toBeUndefined();
    expect(declined.data?.declineInvitationById).toEqual({
      id,
      declinedAt: expect.any(String),
      acceptedAt: null,
    });
    expect(await declinedAtOf(id)).toBeInstanceOf(Date);
    expect(
      await sql`select 1 from workspace_members where workspace_id = ${WORKSPACE_W_ID} and user_id = ${GRANTEE}`,
    ).toHaveLength(0);
  });

  it('answers NOT_FOUND for another account’s id, which its owner then declines', async () => {
    const id = await inviteGrantee();

    const refused = await run(asUser(stranger), DECLINE_BY_ID, { id });

    expect(refused.errors?.[0]).toMatchObject({ extensions: { code: 'NOT_FOUND' } });
    expect(await declinedAtOf(id)).toBeNull();
    const declined = await run(asUser(grantee), DECLINE_BY_ID, { id });
    expect(declined.errors).toBeUndefined();
  });

  it('answers FORBIDDEN for an invitation already declined, which a pending one is not', async () => {
    const id = await inviteGrantee();
    const pending = await inviteGrantee('second-token');
    await run(asUser(grantee), DECLINE_BY_ID, { id });

    const refused = await run(asUser(grantee), DECLINE_BY_ID, { id });

    expect(refused.errors?.[0]).toMatchObject({ extensions: { code: 'FORBIDDEN' } });
    const declined = await run(asUser(grantee), DECLINE_BY_ID, { id: pending });
    expect(declined.errors).toBeUndefined();
  });
});
