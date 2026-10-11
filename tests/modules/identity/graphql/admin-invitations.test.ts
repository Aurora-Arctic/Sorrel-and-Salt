import { createHash } from 'node:crypto';
import { isObjectType } from 'graphql';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import postgres from 'postgres';
import { schema } from '@/graphql/schema';
import type { InvitationSender } from '@/modules/identity';
import { E, asUser } from '../../../support/as-user';
import { asManualFix } from '../../../support/db/privileges';
import { run } from '../../../support/graphql/run';
import type { AcceptInvitationResult, CreateAdminInvitationResult } from './types';

// MB.70's three mutations, the transport's half
// (claude-docs/testing/layer-ownership.md): an admin's answer, which carries
// no token and no link, the session as the actor, and one refusal per error
// code, read as the browser reads them. Which callers, addresses and links the
// services refuse is services/admin-invitations.test.ts's and
// services/invitation-acceptance.test.ts's; a signed-out caller and the scope
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
  const sent: { to: string; token: string }[] = [];
  const sender: InvitationSender = {
    siteInvitation: async (to, token) => {
      sent.push({ to, token });
    },
  };
  return { sent, sender };
}

beforeEach(async () => {
  await sql`truncate invitations`;
  await sql`truncate admin_role_change_pauses`;
  await sql`truncate user_privilege_changes`;
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
  mutation ($email: String!, $note: String) {
    createAdminInvitation(email: $email, note: $note) {
      id email note expiresAt audit { createdBy }
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
      note: 'Curates the resins',
      audit: { createdBy: E.id },
    });
    expect(sent).toEqual([{ to: INVITED, token: expect.any(String) }]);
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
      'email',
      'expiresAt',
      'id',
      'note',
      'revokedAt',
    ]);
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
