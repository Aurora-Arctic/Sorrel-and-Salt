import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { WORKSPACE_W_ID, WORKSPACE_X_ID } from '@/db/seed/standard';
import { AccessPaused, Forbidden } from '@/lib/errors';
import {
  type Membership,
  type WorkspacePermission,
  type WorkspaceRole,
  assertMembership,
} from '@/modules/coven';
import { A, B, C, D, E, asUser } from '../../../support/as-user';

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

  it('refuses a site keeper, who is a member of nothing', async () => {
    // Why this could have succeeded: E's session says `admin`, the role that
    // would carry a bypass if one existed. It does not — a keeper curates the
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

  // Asked of the database, an id that is not a uuid is a driver error rather
  // than a refusal. B is a member of W, so the only thing refused is the id.
  it.each(['not-a-coven', WORKSPACE_W_ID.slice(0, -1), ''])(
    'refuses a workspace id that is not a uuid, %o',
    async (workspaceId) => {
      await expect(
        assertMembership(asUser(B), WORKSPACE_W_ID, { spell: ['read'] }),
      ).resolves.toBeDefined();

      await expect(
        assertMembership(asUser(B), workspaceId, { spell: ['read'] }),
      ).rejects.toBeInstanceOf(Forbidden);
    },
  );

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

  describe('a paused member', () => {
    /** A pause on B in W, written as the seed would, and closed again by the caller. */
    async function pauseB(until: string | null) {
      const [row] = await sql`
        insert into workspace_member_pauses (workspace_id, user_id, until, note, created_by, updated_by)
        values (${WORKSPACE_W_ID}, ${B.id}, ${until}, 'Fixture pause', ${A.id}, ${A.id})
        returning id
      `;
      return row!.id as string;
    }

    async function clearPauses() {
      await sql`delete from workspace_member_pauses where workspace_id = ${WORKSPACE_W_ID} and user_id = ${B.id}`;
    }

    it('is refused every read and write by direct id, with AccessPaused rather than a bare Forbidden', async () => {
      // Why this could have succeeded: B is admitted to W for both a read and a
      // write before the pause, so the refusal below is the pause alone.
      await expect(
        assertMembership(asUser(B), WORKSPACE_W_ID, { spell: ['read'] }),
      ).resolves.toMatchObject({ role: 'member' });
      await expect(
        assertMembership(asUser(B), WORKSPACE_W_ID, { spell: ['create'] }),
      ).resolves.toMatchObject({ role: 'member' });

      await pauseB('2099-01-01T00:00:00Z');
      try {
        for (const permission of [{ spell: ['read'] }, { spell: ['create'] }] as const) {
          const refusal = assertMembership(asUser(B), WORKSPACE_W_ID, permission);
          await expect(refusal).rejects.toBeInstanceOf(AccessPaused);
          await expect(refusal).rejects.toMatchObject({ until: new Date('2099-01-01T00:00:00Z') });
        }
        // An open-ended pause carries no end.
        await clearPauses();
        await pauseB(null);
        await expect(
          assertMembership(asUser(B), WORKSPACE_W_ID, { spell: ['read'] }),
        ).rejects.toMatchObject({ name: 'AccessPaused', until: null });
        // The seat stays: the row is live and keeps its role.
        const [seat] = await sql`
          select role, deleted_at from workspace_members
           where workspace_id = ${WORKSPACE_W_ID} and user_id = ${B.id}
        `;
        expect(seat).toEqual({ role: 'member', deleted_at: null });
      } finally {
        await clearPauses();
      }
    });

    it('is admitted again once the pause is lifted', async () => {
      const id = await pauseB(null);
      try {
        await expect(
          assertMembership(asUser(B), WORKSPACE_W_ID, { spell: ['read'] }),
        ).rejects.toBeInstanceOf(AccessPaused);

        await sql`update workspace_member_pauses set lifted_at = now(), lifted_by = ${A.id} where id = ${id}`;

        await expect(
          assertMembership(asUser(B), WORKSPACE_W_ID, { spell: ['create'] }),
        ).resolves.toMatchObject({ role: 'member' });
      } finally {
        await clearPauses();
      }
    });

    it('is admitted again once the pause has run out, with no write', async () => {
      const id = await pauseB('2099-01-01T00:00:00Z');
      try {
        await expect(
          assertMembership(asUser(B), WORKSPACE_W_ID, { spell: ['read'] }),
        ).rejects.toBeInstanceOf(AccessPaused);

        // Time passes: the end moves behind now, and the row stays unlifted.
        await sql`update workspace_member_pauses set until = now() - interval '1 minute' where id = ${id}`;

        await expect(
          assertMembership(asUser(B), WORKSPACE_W_ID, { spell: ['create'] }),
        ).resolves.toMatchObject({ role: 'member' });
        const [row] = await sql`select lifted_at from workspace_member_pauses where id = ${id}`;
        expect(row?.lifted_at).toBeNull();
      } finally {
        await clearPauses();
      }
    });

    it('keeps every other coven: a pause in W does not reach the same user elsewhere', async () => {
      const [other] = await sql`
        insert into workspaces (name, slug, created_by, updated_by)
        values ('Fixture Coven Unpaused', 'fixture-coven-unpaused', ${A.id}, ${A.id})
        returning id
      `;
      await sql`
        insert into workspace_members (workspace_id, user_id, role, created_by, updated_by)
        values (${other!.id}, ${B.id}, 'member', ${A.id}, ${A.id})
      `;
      await pauseB(null);
      try {
        await expect(
          assertMembership(asUser(B), WORKSPACE_W_ID, { spell: ['read'] }),
        ).rejects.toBeInstanceOf(AccessPaused);
        await expect(
          assertMembership(asUser(B), other!.id, { spell: ['create'] }),
        ).resolves.toMatchObject({ workspaceId: other!.id, role: 'member' });
      } finally {
        await clearPauses();
      }
    });

    it('answers a non-member with a bare Forbidden, never AccessPaused, so the two stay apart', async () => {
      // D holds no seat in W; a pause row naming D there (which no service
      // writes) still leaves D a stranger rather than a paused member.
      await sql`
        insert into workspace_member_pauses (workspace_id, user_id, created_by, updated_by)
        values (${WORKSPACE_W_ID}, ${D.id}, ${A.id}, ${A.id})
      `;
      try {
        const refusal = assertMembership(asUser(D), WORKSPACE_W_ID, { spell: ['read'] });
        await expect(refusal).rejects.toBeInstanceOf(Forbidden);
        await expect(refusal).rejects.not.toBeInstanceOf(AccessPaused);
      } finally {
        await sql`delete from workspace_member_pauses where user_id = ${D.id}`;
      }
    });
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
    const refusal = assertMembership(asUser(A), WORKSPACE_W_ID, {});
    await expect(refusal).rejects.toThrow('requires a permission');
    await expect(refusal).rejects.not.toBeInstanceOf(Forbidden);
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
