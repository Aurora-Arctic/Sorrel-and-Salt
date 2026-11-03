import { describe, expect, it } from 'vitest';
import { AccessPaused, Forbidden, NotFound, ValidationError } from '@/lib/errors';
import {
  assertMembership,
  liftMemberAccessPause,
  listMemberPauses,
  pauseMemberAccess,
  pausedCovenBySlug,
  standingMemberPauses,
} from '@/modules/coven';
import { SIGNED_OUT_SENDER_ID } from '@/lib/support-sender';
import { SYSTEM_ACTOR_ID } from '@/lib/system-actor';
import { A, B, C, D, E, asUser } from '../../../support/as-user';
import { sql, useRawClient } from '../../../support/db/probe-tables';
import { makeWorkspace, workspaceColumns } from '../../../support/fixtures';
import { noPauseNotifier } from '../../../support/email-verification';

useRawClient();

// An owner pauses one member's access to their coven, until a time or with no end, and may lift it early. The member keeps
// the seat; every coven call refuses them with AccessPaused while the pause stands (membership.test.ts proves the refusal).

type Role = 'owner' | 'member' | 'viewer';

const LATER = new Date('2099-01-01T00:00:00Z');

async function insertCoven(
  name: string,
  members: [string, Role][],
  { demo = false } = {},
): Promise<string> {
  const [row] = await sql`
    insert into workspaces ${sql({ ...workspaceColumns(makeWorkspace({ name })), demo, created_by: A.id, updated_by: A.id })}
    returning id`;
  for (const [userId, role] of members) {
    await sql`
      insert into workspace_members (workspace_id, user_id, role, created_by, updated_by)
      values (${row.id}, ${userId}, ${role}, ${A.id}, ${A.id})`;
  }
  return row.id as string;
}

const pausesOf = (workspaceId: string, userId: string) => sql`
  select until, note, lifted_at, lifted_by, created_by, updated_by from workspace_member_pauses
   where workspace_id = ${workspaceId} and user_id = ${userId}
   order by created_at`;

const roleOf = async (workspaceId: string, userId: string) =>
  (
    await sql`
      select role from workspace_members where workspace_id = ${workspaceId} and user_id = ${userId}`
  )[0]?.role as string | undefined;

/** The issue paths a ValidationError carries, or the error itself when it is something else. */
async function issuePaths(promise: Promise<unknown>): Promise<unknown> {
  const error = await promise.then(
    () => undefined,
    (thrown: unknown) => thrown,
  );
  return error instanceof ValidationError ? error.issues.map((issue) => issue.path) : error;
}

describe('pauseMemberAccess', () => {
  it("pauses a member until a time, stamped with the owner's id, and the member keeps the seat", async () => {
    const covenId = await insertCoven('Fixture Pause Coven', [
      [A.id, 'owner'],
      [B.id, 'member'],
    ]);
    // Why the refusal afterwards is the pause's: B is admitted before it.
    await expect(
      assertMembership(asUser(B), covenId, { spell: ['create'] }),
    ).resolves.toMatchObject({ role: 'member' });

    const row = await pauseMemberAccess(
      asUser(A),
      covenId,
      B.id,
      LATER,
      '  Cooling off  ',
      noPauseNotifier,
    );

    expect(row).toMatchObject({
      workspaceId: covenId,
      userId: B.id,
      until: LATER,
      note: 'Cooling off',
      liftedAt: null,
      createdBy: A.id,
      updatedBy: A.id,
    });
    await expect(assertMembership(asUser(B), covenId, { spell: ['read'] })).rejects.toBeInstanceOf(
      AccessPaused,
    );
    const [seat] = await sql`
      select role, deleted_at from workspace_members
       where workspace_id = ${covenId} and user_id = ${B.id}`;
    expect(seat).toEqual({ role: 'member', deleted_at: null });
  });

  it('pauses with no end when no time is given, and keeps no blank note', async () => {
    const covenId = await insertCoven('Fixture Open Pause Coven', [
      [A.id, 'owner'],
      [C.id, 'viewer'],
    ]);

    const row = await pauseMemberAccess(
      asUser(A),
      covenId,
      C.id,
      undefined,
      '   ',
      noPauseNotifier,
    );

    expect(row).toMatchObject({ userId: C.id, until: null, note: null });
    await expect(assertMembership(asUser(C), covenId, { spell: ['read'] })).rejects.toMatchObject({
      name: 'AccessPaused',
      until: null,
    });
  });

  it('refuses a member and a viewer of the coven, who do belong to it, and writes nothing', async () => {
    const covenId = await insertCoven('Fixture Pause Refusal Coven', [
      [A.id, 'owner'],
      [B.id, 'member'],
      [C.id, 'viewer'],
    ]);
    // Why the refusal is the permission's: each caller is admitted to the coven.
    await expect(
      assertMembership(asUser(B), covenId, { spell: ['create'] }),
    ).resolves.toBeDefined();
    await expect(assertMembership(asUser(C), covenId, { spell: ['read'] })).resolves.toBeDefined();

    await expect(
      pauseMemberAccess(asUser(B), covenId, C.id, LATER, null, noPauseNotifier),
    ).rejects.toThrow(Forbidden);
    await expect(
      pauseMemberAccess(asUser(C), covenId, B.id, LATER, null, noPauseNotifier),
    ).rejects.toThrow(Forbidden);
    expect(await pausesOf(covenId, B.id)).toHaveLength(0);
    expect(await pausesOf(covenId, C.id)).toHaveLength(0);
  });

  it("refuses an owner of another coven, by this coven's id", async () => {
    const covenId = await insertCoven('Fixture Paused Elsewhere Coven', [
      [A.id, 'owner'],
      [B.id, 'member'],
    ]);
    const homeId = await insertCoven('Fixture Pausing Home Coven', [
      [D.id, 'owner'],
      [C.id, 'member'],
    ]);
    // Why this could have succeeded: D holds the permission, in D's own coven.
    const proof = await assertMembership(asUser(D), homeId, { member: ['pause'] });
    expect(proof.role).toBe('owner');

    await expect(
      pauseMemberAccess(asUser(D), covenId, B.id, LATER, null, noPauseNotifier),
    ).rejects.toThrow(Forbidden);
    expect(await pausesOf(covenId, B.id)).toHaveLength(0);
  });

  it('refuses a site admin, who holds no seat in the coven', async () => {
    const covenId = await insertCoven('Fixture Admin Pause Coven', [
      [A.id, 'owner'],
      [B.id, 'member'],
    ]);
    // Why this could have succeeded: E is a site admin, and admins hold owner seats in the demo coven.
    expect(asUser(E).role).toBe('admin');

    const refusal = pauseMemberAccess(asUser(E), covenId, B.id, LATER, null, noPauseNotifier);
    await expect(refusal).rejects.toThrow(Forbidden);
    await expect(refusal).rejects.not.toBeInstanceOf(AccessPaused);
    expect(await pausesOf(covenId, B.id)).toHaveLength(0);
  });

  it('lets a site admin pause in the demo coven only from an owner seat there', async () => {
    const demoId = await insertCoven(
      'Fixture Demo Pause Coven',
      [
        [A.id, 'owner'],
        [B.id, 'viewer'],
      ],
      { demo: true },
    );

    await expect(
      pauseMemberAccess(asUser(E), demoId, B.id, LATER, null, noPauseNotifier),
    ).rejects.toThrow(Forbidden);
    expect(await pausesOf(demoId, B.id)).toHaveLength(0);

    // The owner seat every admin holds in the demo coven is what admits, not the admin role.
    await sql`
      insert into workspace_members (workspace_id, user_id, role, created_by, updated_by)
      values (${demoId}, ${E.id}, 'owner', ${A.id}, ${A.id})`;
    await expect(
      pauseMemberAccess(asUser(E), demoId, B.id, LATER, null, noPauseNotifier),
    ).resolves.toMatchObject({
      userId: B.id,
      createdBy: E.id,
    });
  });

  it('refuses to pause an owner, saying why, and writes nothing', async () => {
    const covenId = await insertCoven('Fixture Owner Pause Coven', [
      [A.id, 'owner'],
      [D.id, 'owner'],
    ]);
    // Why this could have succeeded: A holds the permission and D a live seat.
    await expect(
      assertMembership(asUser(A), covenId, { member: ['pause'] }),
    ).resolves.toBeDefined();

    // The sentence the browser shows, whole: the members page names no field, so it says the error's message.
    const owner =
      "A steward's access can't be paused. Change their role first if they should be paused.";
    await expect(
      pauseMemberAccess(asUser(A), covenId, D.id, LATER, null, noPauseNotifier),
    ).rejects.toThrow(new Forbidden(owner));
    await expect(
      pauseMemberAccess(asUser(A), covenId, A.id, null, null, noPauseNotifier),
    ).rejects.toThrow(new Forbidden(owner));
    expect(await pausesOf(covenId, D.id)).toHaveLength(0);
    expect(await pausesOf(covenId, A.id)).toHaveLength(0);
  });

  it.each([
    ['the System account', SYSTEM_ACTOR_ID],
    ['the signed-out sender account', SIGNED_OUT_SENDER_ID],
  ])(
    'refuses %s, which is not a person, even holding a seat, saying why',
    async (label, accountId) => {
      const covenId = await insertCoven(`Fixture Pause Stand-In Coven for ${label}`, [
        [A.id, 'owner'],
        [accountId, 'member'],
        [B.id, 'member'],
      ]);
      // Why this could have succeeded: the account holds a seat, and the same call pauses another member in the same seat.
      expect(await roleOf(covenId, accountId)).toBe('member');
      await pauseMemberAccess(asUser(A), covenId, B.id, LATER, null, noPauseNotifier);
      expect(await pausesOf(covenId, B.id)).toHaveLength(1);

      const error = await pauseMemberAccess(
        asUser(A),
        covenId,
        accountId,
        LATER,
        null,
        noPauseNotifier,
      ).catch((thrown: unknown) => thrown);

      expect(error).toBeInstanceOf(Forbidden);
      expect((error as Error).message).toBe(
        'This account is not a person, so its access to a coven cannot be paused',
      );
      expect(await pausesOf(covenId, accountId)).toHaveLength(0);
    },
  );

  it('refuses a person who is not a member of the coven, and an id that names no one', async () => {
    const covenId = await insertCoven('Fixture Stranger Pause Coven', [[A.id, 'owner']]);

    const stranger = new Forbidden('That person is not a member of this coven');
    await expect(
      pauseMemberAccess(asUser(A), covenId, D.id, LATER, null, noPauseNotifier),
    ).rejects.toThrow(stranger);
    // An id that cannot name a user is refused as a wrong one is, in the same words.
    await expect(
      pauseMemberAccess(asUser(A), covenId, 'not-an-id', LATER, null, noPauseNotifier),
    ).rejects.toThrow(stranger);
    expect(await pausesOf(covenId, D.id)).toHaveLength(0);
  });

  it('refuses a second pause while one stands, and writes nothing', async () => {
    const covenId = await insertCoven('Fixture Double Pause Coven', [
      [A.id, 'owner'],
      [B.id, 'member'],
    ]);
    await pauseMemberAccess(asUser(A), covenId, B.id, LATER, 'First', noPauseNotifier);

    const second = pauseMemberAccess(asUser(A), covenId, B.id, null, 'Second', noPauseNotifier);
    await expect(second).rejects.toThrow(ValidationError);
    await expect(issuePaths(second)).resolves.toEqual([['userId']]);
    // The sentence the browser shows: the members page names no field, so it says the error's message.
    await expect(
      pauseMemberAccess(asUser(A), covenId, B.id, null, 'Second', noPauseNotifier),
    ).rejects.toMatchObject({
      message: 'This member is already paused; lift the pause first',
      issues: [{ message: 'This member is already paused; lift the pause first' }],
    });
    const rows = await pausesOf(covenId, B.id);
    expect(rows.map((row) => row.note)).toEqual(['First']);
  });

  it('sets a new pause once the last has run out, closing the old row', async () => {
    const covenId = await insertCoven('Fixture Run Out Pause Coven', [
      [A.id, 'owner'],
      [B.id, 'member'],
    ]);
    await pauseMemberAccess(asUser(A), covenId, B.id, LATER, 'First', noPauseNotifier);
    await sql`
      update workspace_member_pauses set until = now() - interval '1 minute'
       where workspace_id = ${covenId} and user_id = ${B.id}`;

    await expect(
      pauseMemberAccess(asUser(A), covenId, B.id, null, 'Second', noPauseNotifier),
    ).resolves.toMatchObject({ note: 'Second', until: null });

    const rows = await pausesOf(covenId, B.id);
    expect(rows.map((row) => [row.note, row.lifted_by])).toEqual([
      ['First', A.id],
      ['Second', null],
    ]);
  });

  it('refuses a time that is not in the future, and a note over 500 characters', async () => {
    const covenId = await insertCoven('Fixture Invalid Pause Coven', [
      [A.id, 'owner'],
      [B.id, 'member'],
    ]);

    await expect(
      issuePaths(
        pauseMemberAccess(
          asUser(A),
          covenId,
          B.id,
          new Date(Date.now() - 1000),
          null,
          noPauseNotifier,
        ),
      ),
    ).resolves.toEqual([['until']]);
    await expect(
      issuePaths(
        pauseMemberAccess(asUser(A), covenId, B.id, new Date('invalid'), null, noPauseNotifier),
      ),
    ).resolves.toEqual([['until']]);
    await expect(
      issuePaths(
        pauseMemberAccess(asUser(A), covenId, B.id, LATER, 'x'.repeat(501), noPauseNotifier),
      ),
    ).resolves.toEqual([['note']]);
    // The sentences the browser shows: the members page names no field, so it says each error's message.
    await expect(
      pauseMemberAccess(
        asUser(A),
        covenId,
        B.id,
        new Date(Date.now() - 1000),
        null,
        noPauseNotifier,
      ),
    ).rejects.toMatchObject({ message: 'Choose a time in the future' });
    await expect(
      pauseMemberAccess(asUser(A), covenId, B.id, LATER, 'x'.repeat(501), noPauseNotifier),
    ).rejects.toMatchObject({ message: 'Keep the note to 500 characters' });
    expect(await pausesOf(covenId, B.id)).toHaveLength(0);

    // The limit itself is allowed.
    await expect(
      pauseMemberAccess(asUser(A), covenId, B.id, LATER, 'x'.repeat(500), noPauseNotifier),
    ).resolves.toBeDefined();
  });
});

describe('liftMemberAccessPause', () => {
  it("lifts the standing pause, stamped with the owner's id, and the member is admitted again", async () => {
    const covenId = await insertCoven('Fixture Lift Coven', [
      [A.id, 'owner'],
      [B.id, 'member'],
    ]);
    await pauseMemberAccess(asUser(A), covenId, B.id, null, null, noPauseNotifier);
    await expect(assertMembership(asUser(B), covenId, { spell: ['read'] })).rejects.toBeInstanceOf(
      AccessPaused,
    );

    const row = await liftMemberAccessPause(asUser(A), covenId, B.id);

    expect(row).toMatchObject({ userId: B.id, liftedBy: A.id, updatedBy: A.id });
    expect(row.liftedAt).toBeInstanceOf(Date);
    await expect(
      assertMembership(asUser(B), covenId, { spell: ['create'] }),
    ).resolves.toMatchObject({ role: 'member' });
  });

  it('answers NotFound when no pause stands: none set, lifted already, or run out', async () => {
    const covenId = await insertCoven('Fixture Lift Nothing Coven', [
      [A.id, 'owner'],
      [B.id, 'member'],
    ]);
    await expect(liftMemberAccessPause(asUser(A), covenId, B.id)).rejects.toThrow(NotFound);

    await pauseMemberAccess(asUser(A), covenId, B.id, null, null, noPauseNotifier);
    await liftMemberAccessPause(asUser(A), covenId, B.id);
    await expect(liftMemberAccessPause(asUser(A), covenId, B.id)).rejects.toThrow(NotFound);

    await pauseMemberAccess(asUser(A), covenId, B.id, LATER, null, noPauseNotifier);
    await sql`
      update workspace_member_pauses set until = now() - interval '1 minute'
       where workspace_id = ${covenId} and user_id = ${B.id} and lifted_at is null`;
    await expect(liftMemberAccessPause(asUser(A), covenId, B.id)).rejects.toThrow(NotFound);
  });

  it('refuses a person who is not a member of the coven, rather than answering NotFound', async () => {
    const covenId = await insertCoven('Fixture Lift Stranger Coven', [[A.id, 'owner']]);

    await expect(liftMemberAccessPause(asUser(A), covenId, D.id)).rejects.toThrow(
      'That person is not a member of this coven',
    );
    await expect(liftMemberAccessPause(asUser(A), covenId, 'not-an-id')).rejects.toThrow(Forbidden);
  });

  it('refuses a member, a viewer, an owner of another coven and a site admin, and the pause stands', async () => {
    const covenId = await insertCoven('Fixture Lift Refusal Coven', [
      [A.id, 'owner'],
      [B.id, 'member'],
      [C.id, 'viewer'],
    ]);
    const homeId = await insertCoven('Fixture Lift Home Coven', [[D.id, 'owner']]);
    await pauseMemberAccess(asUser(A), covenId, C.id, null, null, noPauseNotifier);
    // Why each could have succeeded: B is admitted to the coven, D holds the permission in D's own, and E is a site admin.
    await expect(
      assertMembership(asUser(B), covenId, { spell: ['create'] }),
    ).resolves.toBeDefined();
    await expect(assertMembership(asUser(D), homeId, { member: ['pause'] })).resolves.toBeDefined();
    expect(asUser(E).role).toBe('admin');

    for (const caller of [B, D, E]) {
      await expect(liftMemberAccessPause(asUser(caller), covenId, C.id)).rejects.toThrow(Forbidden);
    }
    // The paused viewer cannot lift their own pause: the pause refuses them first.
    await expect(liftMemberAccessPause(asUser(C), covenId, C.id)).rejects.toBeInstanceOf(
      AccessPaused,
    );
    const [row] = await pausesOf(covenId, C.id);
    expect(row?.lifted_at).toBeNull();
  });
});

describe('standingMemberPauses', () => {
  it('answers the pause standing on each asked member, and none for a lifted, run-out or unasked one', async () => {
    const covenId = await insertCoven('Fixture Standing Coven', [
      [A.id, 'owner'],
      [B.id, 'member'],
      [C.id, 'viewer'],
    ]);
    await pauseMemberAccess(asUser(A), covenId, B.id, LATER, null, noPauseNotifier);
    await pauseMemberAccess(asUser(A), covenId, C.id, null, null, noPauseNotifier);
    await liftMemberAccessPause(asUser(A), covenId, C.id);
    // A run-out pause on C, written straight in, since the service refuses a past end.
    await sql`
      insert into workspace_member_pauses (workspace_id, user_id, until, created_by, updated_by)
      values (${covenId}, ${C.id}, now() - interval '1 minute', ${A.id}, ${A.id})`;

    const rows = await standingMemberPauses(asUser(A), covenId, [B.id, C.id, 'not-an-id']);
    expect(rows.map(({ userId, until }) => ({ userId, until }))).toEqual([
      { userId: B.id, until: LATER },
    ]);
    // Only the asked ids: B stands, but is not asked here.
    await expect(standingMemberPauses(asUser(A), covenId, [C.id])).resolves.toEqual([]);
  });

  it("reads only the proof's coven: a pause in another coven is not answered", async () => {
    const covenId = await insertCoven('Fixture Standing Here', [
      [A.id, 'owner'],
      [B.id, 'member'],
    ]);
    const otherId = await insertCoven('Fixture Standing There', [
      [A.id, 'owner'],
      [B.id, 'member'],
    ]);
    await pauseMemberAccess(asUser(A), otherId, B.id, LATER, null, noPauseNotifier);
    // Why the empty answer is the coven filter's: B does stand paused, in the other coven.
    await expect(standingMemberPauses(asUser(A), otherId, [B.id])).resolves.toHaveLength(1);
    await expect(standingMemberPauses(asUser(A), covenId, [B.id])).resolves.toEqual([]);
  });

  it('refuses a member and a viewer, who hold no member: pause', async () => {
    const covenId = await insertCoven('Fixture Standing Refused', [
      [A.id, 'owner'],
      [B.id, 'member'],
      [C.id, 'viewer'],
    ]);
    await expect(standingMemberPauses(asUser(A), covenId, [B.id])).resolves.toEqual([]);
    await expect(standingMemberPauses(asUser(B), covenId, [C.id])).rejects.toBeInstanceOf(
      Forbidden,
    );
    await expect(standingMemberPauses(asUser(C), covenId, [B.id])).rejects.toBeInstanceOf(
      Forbidden,
    );
  });
});

describe('listMemberPauses', () => {
  it("answers one member's pauses, newest first, lifted and standing alike, and no other member's", async () => {
    const covenId = await insertCoven('Fixture History Coven', [
      [A.id, 'owner'],
      [B.id, 'member'],
      [C.id, 'viewer'],
    ]);
    await pauseMemberAccess(asUser(A), covenId, B.id, null, 'First', noPauseNotifier);
    await liftMemberAccessPause(asUser(A), covenId, B.id);
    await pauseMemberAccess(asUser(A), covenId, B.id, LATER, 'Second', noPauseNotifier);
    await pauseMemberAccess(asUser(A), covenId, C.id, LATER, 'Other', noPauseNotifier);

    const page = await listMemberPauses(asUser(A), covenId, B.id, { limit: 25, inverted: false });
    expect(page.map(({ node }) => [node.note, node.liftedBy])).toEqual([
      ['Second', null],
      ['First', A.id],
    ]);
  });

  it('refuses a member, a viewer and an owner of another coven by direct id', async () => {
    const covenId = await insertCoven('Fixture History Refused', [
      [A.id, 'owner'],
      [B.id, 'member'],
      [C.id, 'viewer'],
    ]);
    const otherId = await insertCoven('Fixture History Elsewhere', [[D.id, 'owner']]);
    await pauseMemberAccess(asUser(A), covenId, C.id, LATER, null, noPauseNotifier);
    const page = { limit: 25, inverted: false };
    // Why each refusal is the guard's: the owner reads the pause, and D is an owner, of another coven.
    await expect(listMemberPauses(asUser(A), covenId, C.id, page)).resolves.toHaveLength(1);
    await expect(listMemberPauses(asUser(D), otherId, D.id, page)).resolves.toEqual([]);
    await expect(listMemberPauses(asUser(B), covenId, C.id, page)).rejects.toBeInstanceOf(
      Forbidden,
    );
    await expect(listMemberPauses(asUser(D), covenId, C.id, page)).rejects.toBeInstanceOf(
      Forbidden,
    );
    await expect(listMemberPauses(asUser(E), covenId, C.id, page)).rejects.toBeInstanceOf(
      Forbidden,
    );
    await expect(listMemberPauses(asUser(A), covenId, 'not-an-id', page)).rejects.toBeInstanceOf(
      Forbidden,
    );
  });
});

describe('pausedCovenBySlug', () => {
  async function slugOf(workspaceId: string): Promise<string> {
    const [row] = await sql`select slug from workspaces where id = ${workspaceId}`;
    return row.slug as string;
  }

  it("names the coven and the end of the pause standing on the caller's seat", async () => {
    const covenId = await insertCoven('Fixture Paused Page Coven', [
      [A.id, 'owner'],
      [B.id, 'member'],
    ]);
    const slug = await slugOf(covenId);
    // Why the answer below is the pause's: before it, B holds a seat with nothing standing on it.
    await expect(pausedCovenBySlug(asUser(B), slug)).resolves.toBeNull();

    await pauseMemberAccess(asUser(A), covenId, B.id, LATER, null, noPauseNotifier);
    await expect(pausedCovenBySlug(asUser(B), slug)).resolves.toEqual({
      id: covenId,
      name: 'Fixture Paused Page Coven',
      until: LATER,
    });

    await liftMemberAccessPause(asUser(A), covenId, B.id);
    await expect(pausedCovenBySlug(asUser(B), slug)).resolves.toBeNull();
  });

  it('refuses a non-member and an unknown slug alike with a bare Forbidden', async () => {
    const covenId = await insertCoven('Fixture Paused Page Stranger', [[A.id, 'owner']]);
    const slug = await slugOf(covenId);
    await expect(pausedCovenBySlug(asUser(A), slug)).resolves.toBeNull();
    await expect(pausedCovenBySlug(asUser(D), slug)).rejects.toEqual(new Forbidden());
    await expect(pausedCovenBySlug(asUser(D), 'no-such-coven-anywhere')).rejects.toEqual(
      new Forbidden(),
    );
  });
});
