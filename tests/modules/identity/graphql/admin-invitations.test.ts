import { createHash } from 'node:crypto';
import { getNamedType, isEnumType, isObjectType, type GraphQLField } from 'graphql';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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
import { useTestDatabase } from '../../../support/db/database';

let sql: ReturnType<typeof postgres>;

useTestDatabase((client) => {
  sql = client;
});

const DOMAIN = '@admin-invitations-graphql.test';
const GRANTEE = '00000000-0000-0000-0000-0000000000f1';
const INVITED = `grantee${DOMAIN}`;

const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');

function recordingSender() {
  const sent: string[] = [];
  const sender: InvitationSender = {
    invitation: async (invitationId) => {
      sent.push(invitationId);
    },
  };
  return { sent, sender };
}

beforeEach(async () => {
  await sql`truncate card_invitation_attempts, invitations`;
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
  // E is the seed's admin; the variable names it the primary keeper here.
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
  it('answers a keeper the invitation, stamped as the session, and hands the sender its id and no token', async () => {
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
    const [stored] = await sql`select id, token_hash from invitations`;
    expect(sent).toEqual([stored!.id]);
    expect(result.data?.createAdminInvitation).toMatchObject({ id: stored!.id });
    expect(JSON.stringify(result)).not.toContain(stored!.token_hash);
  });

  // Not merely absent from this answer: no field could carry them. The one exception is the card mint, whose result
  // answers each new token once (invitation-cards.test.ts holds that mutation to the minting admin).
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

  // A token, hash or link is a string, so a field answering only a Boolean, number or enum cannot carry one, whatever
  // its name: replyToSupportRequestByViewToken takes a token and answers a Boolean.
  const canCarryText = (field: GraphQLField<unknown, unknown>) => {
    const named = getNamedType(field.type);
    return !isEnumType(named) && !['Boolean', 'Int', 'Float'].includes(named.name);
  };

  // Named for the mailed token it takes as its argument; it answers the request, whose own type the scan still reads.
  const TAKES_A_TOKEN = ['Query.supportRequestByViewToken'];
  // Named for the help front page's quick links; it answers their titles, not their addresses.
  const NAMES_LINKS = ['HelpRenameEffects.quickLinks'];

  it('has no token, hash or link field on any type but the card mint result', () => {
    const carriers: string[] = [];
    for (const type of Object.values(schema.getTypeMap())) {
      if (!isObjectType(type) || type.name.startsWith('__')) continue;
      for (const [name, field] of Object.entries(type.getFields())) {
        const path = `${type.name}.${name}`;
        if (TAKES_A_TOKEN.includes(path) || NAMES_LINKS.includes(path)) continue;
        if (/token|hash|link(?!ed)/i.test(name) && canCarryText(field)) carriers.push(path);
      }
    }
    expect(carriers).toEqual(['MintedInvitationCards.tokens']);
  });

  // The role is the keeper's choice, and the transport carries it through. `user` is the invitation to create a coven.
  it.each(['curator', 'user'])(
    'answers the %s role it was asked to invite to',
    async (siteRole) => {
      const { sender } = recordingSender();

      const result = await run<CreateAdminInvitationResult>(
        asUser(E),
        CREATE,
        { email: INVITED, siteRole },
        { invitations: sender },
      );

      expect(result.errors).toBeUndefined();
      expect(result.data?.createAdminInvitation).toMatchObject({ siteRole });
    },
  );

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
  it('answers a keeper the invitation withdrawn, and an id naming none as NOT_FOUND', async () => {
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
    const { sender } = recordingSender();
    await run(asUser(E), CREATE, { email: INVITED }, { invitations: sender });
    // The token the mail's step would have minted, set through the raw client in its place.
    const token = 'fixture-token-cccccccccccccccccccccccccccccccc';
    const [{ id }] = await sql`update invitations set token_hash = ${sha256(token)} returning id`;
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

describe('Mutation.acceptInvitationById', () => {
  const grantee = { id: GRANTEE, role: 'user' as const };
  const stranger = { id: '00000000-0000-0000-0000-0000000000f2', role: 'user' as const };

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

describe('Mutation.declineInvitationById', () => {
  const grantee = { id: GRANTEE, role: 'user' as const };
  const stranger = { id: '00000000-0000-0000-0000-0000000000f2', role: 'user' as const };

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
