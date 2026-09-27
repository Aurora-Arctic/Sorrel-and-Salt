import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { WORKSPACE_W_ID, WORKSPACE_X_ID } from '@/db/seed/standard';
import { Forbidden } from '@/lib/errors';
import type { WorkspacePermission, WorkspaceRole } from '@/services/access-control';
import { type Membership, assertMembership } from '@/services/membership';
import { A, B, C, D, E, asUser } from '../support/as-user';

// The cast against the `standard` seed every db worker's clone carries: A owns
// W, B works in it, C reads it, D is a member of X alone, and E is a site
// admin in no workspace at all.

let sql: ReturnType<typeof postgres>;

beforeAll(() => {
  sql = postgres(process.env.DATABASE_URL as string);
});

afterAll(async () => {
  await sql.end();
});

describe('assertMembership', () => {
  // One permission per role, chosen as the first thing that role may do and
  // the one below it may not. access-control.test.ts has the full matrix;
  // these are what prove the service consults it.
  const CASES: {
    label: string;
    user: typeof A;
    role: WorkspaceRole;
    permission: WorkspacePermission;
  }[] = [
    { label: 'a viewer reading', user: C, role: 'viewer', permission: { spell: ['read'] } },
    { label: 'a member writing', user: B, role: 'member', permission: { spell: ['create'] } },
    { label: 'an owner inviting', user: A, role: 'owner', permission: { member: ['invite'] } },
  ];

  for (const { label, user, role, permission } of CASES) {
    it(`returns a proof for ${label}`, async () => {
      await expect(assertMembership(asUser(user), WORKSPACE_W_ID, permission)).resolves.toEqual({
        workspaceId: WORKSPACE_W_ID,
        userId: user.id,
        role,
      });
    });
  }

  it('refuses a viewer the writes a member holds', async () => {
    // Why this could have succeeded: C is a live member of W and is admitted
    // for the read a moment earlier, so the refusal is the policy and not a
    // missing row.
    await expect(
      assertMembership(asUser(C), WORKSPACE_W_ID, { spell: ['read'] }),
    ).resolves.toMatchObject({ role: 'viewer' });

    await expect(
      assertMembership(asUser(C), WORKSPACE_W_ID, { spell: ['create'] }),
    ).rejects.toBeInstanceOf(Forbidden);
  });

  it('refuses a member the membership roll an owner holds', async () => {
    await expect(
      assertMembership(asUser(B), WORKSPACE_W_ID, { spell: ['create'] }),
    ).resolves.toMatchObject({ role: 'member' });

    await expect(
      assertMembership(asUser(B), WORKSPACE_W_ID, { member: ['invite'] }),
    ).rejects.toBeInstanceOf(Forbidden);
  });

  it('refuses a member of another workspace', async () => {
    // Why this could have succeeded: D is a real member of a real workspace,
    // so the finder is reached and the fixture is not empty. Only the
    // workspace asked for is wrong.
    await expect(
      assertMembership(asUser(D), WORKSPACE_X_ID, { spell: ['create'] }),
    ).resolves.toMatchObject({ workspaceId: WORKSPACE_X_ID, role: 'member' });

    await expect(
      assertMembership(asUser(D), WORKSPACE_W_ID, { spell: ['read'] }),
    ).rejects.toBeInstanceOf(Forbidden);
  });

  it('refuses a site admin, who is a member of nothing', async () => {
    // Why this could have succeeded: E's session says `admin`, the role that
    // would carry a bypass if one existed. It does not — an admin curates the
    // compendium and reaches no workspace (CLAUDE.md).
    expect(asUser(E).role).toBe('admin');

    await expect(
      assertMembership(asUser(E), WORKSPACE_W_ID, { spell: ['read'] }),
    ).rejects.toBeInstanceOf(Forbidden);
  });

  it('refuses a user with no membership row anywhere', async () => {
    const stranger = { id: '00000000-0000-0000-0000-0000000000ff', role: 'user' as const };

    await expect(
      assertMembership(asUser(stranger), WORKSPACE_W_ID, { spell: ['read'] }),
    ).rejects.toBeInstanceOf(Forbidden);
  });

  it('refuses a membership that has been soft-deleted', async () => {
    // Why this could have succeeded: B's row is present and admits B a moment
    // earlier, so the refusal below is the `deleted_at IS NULL` filter and not
    // a missing fixture.
    await expect(
      assertMembership(asUser(B), WORKSPACE_W_ID, { spell: ['create'] }),
    ).resolves.toMatchObject({ role: 'member' });

    await sql`
      update workspace_members
         set deleted_at = now(), deleted_by = ${A.id}
       where workspace_id = ${WORKSPACE_W_ID} and user_id = ${B.id}
    `;

    try {
      await expect(
        assertMembership(asUser(B), WORKSPACE_W_ID, { spell: ['create'] }),
      ).rejects.toBeInstanceOf(Forbidden);
    } finally {
      await sql`
        update workspace_members
           set deleted_at = null, deleted_by = null
         where workspace_id = ${WORKSPACE_W_ID} and user_id = ${B.id}
      `;
    }
  });

  it('refuses a request in the connector form the same way', async () => {
    // The `{ actions, connector }` shape reaches the refusal message by a
    // different path than a bare array, and a message that throws is a
    // refusal that becomes a 500.
    await expect(
      assertMembership(asUser(C), WORKSPACE_W_ID, {
        spell: { actions: ['update', 'delete'], connector: 'OR' },
      }),
    ).rejects.toBeInstanceOf(Forbidden);
  });

  it('rejects an empty permission rather than authorizing vacuously', async () => {
    // Not a Forbidden: an owner would sail through it too, so it is a bug in
    // the caller and reads as one.
    await expect(assertMembership(asUser(A), WORKSPACE_W_ID, {})).rejects.toThrow(
      'requires a permission',
    );
  });
});

// Neither body runs: each `@ts-expect-error` fails `npm run typecheck` the
// moment the brand stops being required, which no runtime assertion can see.
describe('the Membership brand', () => {
  it('cannot be satisfied by an object literal', () => {
    const forge = (): Membership =>
      // @ts-expect-error — the brand is not exported, so no literal can carry
      // it: a proof is what `assertMembership` returns or it does not exist.
      ({ workspaceId: WORKSPACE_W_ID, userId: A.id, role: 'owner' });

    expect(forge).toBeInstanceOf(Function);
  });

  it('cannot be cast to from the session a caller already holds', () => {
    const forge = () =>
      // @ts-expect-error — a session is not a proof. This is the realistic
      // forgery: the caller has one of these and wants the other.
      asUser(A) as Membership;

    expect(forge).toBeInstanceOf(Function);
  });
});
