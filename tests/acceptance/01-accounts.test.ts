import { existsSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type postgres from 'postgres';
import { WORKSPACE_W_ID, WORKSPACE_X_ID } from '@/db/seed/standard';
import { Forbidden } from '@/lib/errors';
import { invitationSender } from '@/lib/invitation-mail';
import type { Session } from '@/lib/session';
import type { Message } from '@/lib/types';
import {
  assertMembership,
  createWorkspace,
  listMembers,
  type WorkspaceRole,
  type WorkspaceRow,
} from '@/modules/coven';
import { setSpellVisibility } from '@/modules/grimoire';
import { acceptInvitation, invitationStanding } from '@/modules/identity';
import {
  createWorkspaceIngredient,
  deleteWorkspaceIngredient,
  getWorkspaceIngredient,
  updateWorkspaceIngredient,
} from '@/modules/ingredients';
import { A, B, C, D, E, asUser } from '../support/as-user';
import { useTestDatabase } from '../support/db/database';
import { insertIngredient } from '../support/db/insert-ingredient';
import { insertSpell } from '../support/db/insert-spell';
import { asManualFix } from '../support/db/privileges';
import {
  makeIngredient,
  makeSpell,
  makeVariant,
  makeWorkspace,
  variantInput,
  workspaceColumns,
} from '../support/fixtures';
import { fromRoot } from '../support/paths';
import { surface } from '../support/unbuilt';
import type { Stamps } from './types';

// Story 1's page exists (M2.6) — Better Auth, the current provider roster
// (Google, Discord, Facebook, Microsoft) and the users table are all live
// (M2.2-M2.6; claude-docs/auth/social-providers.md, "Social providers"). Story 2 is blocked on
// UI Wave 10 hasn't built yet, and its check reads the route's own source
// rather than importing or rendering it: the page doesn't exist yet, and
// importing one that isn't there would fail typecheck instead of the test it
// belongs to.
//
// Stories 3 to 13 (M6.1) are the workspace: creating one, inviting into it,
// moving between covens, its members, and what a viewer may do. Each service
// no task has built yet is looked up with `surface` against a signature stated
// here, so a red story names the task it waits on; the task that builds one
// replaces the lookup with the import and drops the interface. Where a task
// entry names no service, the name is the scaffold's guess, said at the
// interface. Stories 10 to 13 build a coven of their own, so a removal or a
// role change cannot leak into the seeded W another story reads.

const send = vi.hoisted(() => vi.fn<(message: Message) => Promise<void>>());
vi.mock('@/lib/mail', () => ({ send }));

let sql: postgres.Sql;
useTestDatabase((client) => {
  sql = client;
});

type Sender = ReturnType<typeof invitationSender>;

/**
 * M7.3's write: owner only; viewer or member; mails the link to `email` and
 * answers the row without its token. The argument order is the scaffold's guess.
 */
interface InvitationWrites {
  createInvitation(
    session: Session,
    workspaceId: string,
    input: { email: string; role: WorkspaceRole },
    sender: Sender,
  ): Promise<{ id: string }>;
}

/** M7.6's write: owner only, a pending invitation. The name is the scaffold's guess. */
interface InvitationRevokes {
  revokeInvitation(session: Session, id: string): Promise<unknown>;
}

/** M6.15's writes: an owner removes; anyone leaves, so `leaveWorkspace` takes no user id. */
interface MemberRemovals {
  removeMember(session: Session, workspaceId: string, userId: string): Promise<void>;
  leaveWorkspace(session: Session, workspaceId: string): Promise<void>;
}

/** M9.14's write, which runs M6.8's last-owner guard on a demotion. */
interface MemberRoles {
  updateMemberRole(
    session: Session,
    workspaceId: string,
    userId: string,
    role: WorkspaceRole,
  ): Promise<unknown>;
}

/** M6.14's write, an owner's soft delete. The name is the scaffold's guess. */
interface WorkspaceDeletion {
  deleteWorkspace(session: Session, workspaceId: string): Promise<void>;
}

/** M10.5's read. The name is the scaffold's guess. */
interface SpellReads {
  getSpell(session: Session, workspaceId: string, spellId: string): Promise<{ id: string }>;
}

/**
 * M9.4's stock update and M6.18's read of the row's `updatedBy` and
 * `updatedAt`, the editor named through MB.10's loader. Both names and shapes
 * are the scaffold's guess.
 */
interface StockEditor {
  updateStockItem(
    session: Session,
    workspaceId: string,
    stockItemId: string,
    input: { quantityOnHand: string },
  ): Promise<unknown>;
  lastEditOfStockItem(
    session: Session,
    workspaceId: string,
    stockItemId: string,
  ): Promise<{ userId: string; displayName: string; at: Date }>;
}

const coven = () => import('@/modules/coven');

const INVITE_DOMAIN = '@acceptance-invite.test';
const INVITED = `invited${INVITE_DOMAIN}`;
const STRANGER = `stranger${INVITE_DOMAIN}`;

const sender = (): Sender =>
  invitationSender(new Request('http://localhost:8000/api/graphql', { method: 'POST' }));

/** The token in the invitation mailed to `to`: the inbox is the only place it is. */
function mailedToken(to: string): string {
  const mail = send.mock.calls.map(([message]) => message).find((m) => m.to === to);
  const token = mail?.text.match(/\/invite\/([A-Za-z0-9_-]+)/)?.[1];
  if (!token) throw new Error(`no invitation link was mailed to ${to}`);
  return token;
}

/** A live user on the invitation domain, holding no creation right, address verified. */
async function insertInvitee(email: string): Promise<Session> {
  const [row] = await sql.begin(async (tx) => {
    await tx`select set_config('app.privilege_route', 'manual', true)`;
    return tx`
      insert into users (id, name, email, email_verified, role, can_create_workspace, created_by, updated_by)
      values (gen_random_uuid(), 'Fixture Invitee', ${email}, true, 'user', false, ${A.id}, ${A.id})
      returning id
    `;
  });
  return { userId: row.id as string, role: 'user' };
}

async function invitationFor(email: string) {
  const [row] = await sql`
    select id, role, token_hash, accepted_at, accepted_by, revoked_at, expires_at
    from invitations where email = ${email}
  `;
  return row;
}

/** A coven with these members, through the raw client (MB.101). */
async function insertCoven(name: string, members: [string, WorkspaceRole][]): Promise<string> {
  const fixture = makeWorkspace({ name });
  const [row] = await sql`
    insert into workspaces ${sql({ ...workspaceColumns(fixture), created_by: A.id, updated_by: A.id })}
    returning id`;
  for (const [userId, role] of members) {
    await sql`
      insert into workspace_members (workspace_id, user_id, role, created_by, updated_by)
      values (${row.id}, ${userId}, ${role}, ${A.id}, ${A.id})`;
  }
  return row.id as string;
}

/** The roles of the coven's live members, by user. */
async function liveRoles(workspaceId: string): Promise<Record<string, WorkspaceRole>> {
  const rows = await sql<{ user_id: string; role: WorkspaceRole }[]>`
    select user_id, role from workspace_members
    where workspace_id = ${workspaceId} and deleted_at is null`;
  return Object.fromEntries(rows.map((row) => [row.user_id, row.role]));
}

/** Whether `session` is still admitted to the coven at all. */
async function admitted(session: Session, workspaceId: string): Promise<boolean> {
  return assertMembership(session, workspaceId, { ingredient: ['read'] }).then(
    () => true,
    (error: unknown) => {
      if (error instanceof Forbidden) return false;
      throw error;
    },
  );
}

// Stories 4 to 7 reuse the invited addresses, so each starts with no
// invitation, no invitee and an empty inbox.
beforeEach(async () => {
  send.mockReset();
  const invitees = sql`select id from users where email like ${`%${INVITE_DOMAIN}`}`;
  await sql`truncate invitations`;
  await sql`delete from workspace_members where user_id in (${invitees})`;
  await sql`delete from users where email like ${`%${INVITE_DOMAIN}`}`;
});

afterEach(async () => {
  await sql`truncate invitations`;
});

describe("Story 1: Sign in with an account I already have, so I don't manage another password.", () => {
  it("offers a sign-in page at /sign-in, DESIGN.md §9's OAuth entry point", () => {
    expect(existsSync(fromRoot('src/app/sign-in/page.tsx'))).toBe(true);
  });
});

describe("Story 2: As a newly signed-in user, be told plainly what I can do next, so an empty account doesn't look broken.", () => {
  it('explains an invite-only account on the post-sign-in landing', () => {
    // `/coven` is DESIGN.md §9's post-sign-in landing, where M2.8 puts its
    // three states — the third being the one that keeps an empty account
    // from reading as broken. What the page says is its own test's, not this
    // file's: the story's line is that the landing exists.
    const landing = fromRoot('src/app/(shell)/coven/page.tsx');
    expect(existsSync(landing), 'the /coven landing route is not built yet').toBe(true);
  });
});

describe('Story 3: Create a workspace once I hold creation rights, for my coven or household.', () => {
  it('makes the creator its owner, and refuses a user without the right', async () => {
    // Why D's refusal is the gate's: every fixture user starts holding the
    // right (the seed), so clearing it is the only difference, and A still holds it.
    await asManualFix(
      sql,
      (tx) => tx`update users set can_create_workspace = false where id = ${D.id}`,
    );
    const [{ can_create_workspace: stillHolds }] = await sql`
      select can_create_workspace from users where id = ${A.id}`;
    expect(stillHolds).toBe(true);

    const created = await createWorkspace(asUser(A), { name: 'Fixture Coven' });
    const [owner] = await sql`
      select role from workspace_members
      where workspace_id = ${created.id} and user_id = ${A.id} and deleted_at is null`;
    expect(owner.role).toBe('owner');

    // The right is not consumed: a second workspace, and a different slug.
    const second = await createWorkspace(asUser(A), { name: 'Fixture Coven' });
    expect(second.slug).not.toBe(created.slug);

    await expect(createWorkspace(asUser(D), { name: 'Fixture Hearth' })).rejects.toThrow(Forbidden);
    const made = await sql`select id from workspaces where name = 'Fixture Hearth'`;
    expect(made).toHaveLength(0);

    // The gate reads the flag alone: the admin E creates through it.
    await expect(
      createWorkspace(asUser(E), { name: 'Fixture Admin Coven' }),
    ).resolves.toBeDefined();
  });
});

describe('Story 4: Invite someone to my workspace by email with a chosen role (viewer or member), so that only the verified holder of that address can accept.', () => {
  it('mails the link to that address alone, keeps only its hash, refuses owner and non-owners, and admits only the matching verified account', async () => {
    const { createInvitation } = surface<InvitationWrites>(
      await coven(),
      ['createInvitation'],
      'M7.3',
    );
    const stranger = await insertInvitee(STRANGER);
    const invited = await insertInvitee(INVITED);

    // Owner as a role is refused, with the precondition that A could invite.
    expect((await assertMembership(asUser(A), WORKSPACE_W_ID, { member: ['invite'] })).role).toBe(
      'owner',
    );
    await expect(
      createInvitation(asUser(A), WORKSPACE_W_ID, { email: INVITED, role: 'owner' }, sender()),
    ).rejects.toThrow();
    expect(await invitationFor(INVITED)).toBeUndefined();

    // B holds a seat in W and still may not invite.
    expect((await assertMembership(asUser(B), WORKSPACE_W_ID, { spell: ['read'] })).role).toBe(
      'member',
    );
    await expect(
      createInvitation(asUser(B), WORKSPACE_W_ID, { email: INVITED, role: 'member' }, sender()),
    ).rejects.toThrow(Forbidden);
    expect(send).not.toHaveBeenCalled();

    const row = await createInvitation(
      asUser(A),
      WORKSPACE_W_ID,
      { email: INVITED, role: 'member' },
      sender(),
    );

    const token = mailedToken(INVITED);
    expect(send.mock.calls.map(([message]) => message.to)).toEqual([INVITED]);
    expect(JSON.stringify(row)).not.toContain(token);
    const stored = await invitationFor(INVITED);
    expect(stored).toMatchObject({ role: 'member', accepted_at: null, revoked_at: null });
    expect(stored.token_hash).not.toBe(token);

    // A verified account at another address holds the link and is refused.
    await expect(acceptInvitation(stranger, token)).rejects.toThrow(Forbidden);
    expect((await invitationFor(INVITED)).accepted_at).toBeNull();
    // The match is what admits.
    await acceptInvitation(invited, token);
    expect((await invitationFor(INVITED)).accepted_by).toBe(invited.userId);
  });
});

describe("Story 5: Revoke a pending invitation before it's accepted.", () => {
  it('stamps revoked_at and keeps the row for the owner alone, and refuses an accepted one', async () => {
    const { revokeInvitation } = surface<InvitationRevokes>(
      await coven(),
      ['revokeInvitation'],
      'M7.6',
    );
    const { createInvitation } = surface<InvitationWrites>(
      await coven(),
      ['createInvitation'],
      'M7.3',
    );
    const invited = await insertInvitee(INVITED);
    const accepted = await insertInvitee(STRANGER);
    const pending = await createInvitation(
      asUser(A),
      WORKSPACE_W_ID,
      { email: INVITED, role: 'viewer' },
      sender(),
    );
    await createInvitation(
      asUser(A),
      WORKSPACE_W_ID,
      { email: STRANGER, role: 'viewer' },
      sender(),
    );
    await acceptInvitation(accepted, mailedToken(STRANGER));

    // A direct id, from a member and from a viewer, with the pending row there to hit.
    expect(await invitationFor(INVITED)).toMatchObject({ id: pending.id, revoked_at: null });
    await expect(revokeInvitation(asUser(B), pending.id)).rejects.toThrow(Forbidden);
    await expect(revokeInvitation(asUser(C), pending.id)).rejects.toThrow(Forbidden);
    // An owner of another workspace is no owner of this one.
    await expect(revokeInvitation(asUser(D), pending.id)).rejects.toThrow();
    expect((await invitationFor(INVITED)).revoked_at).toBeNull();

    await revokeInvitation(asUser(A), pending.id);
    expect((await invitationFor(INVITED)).revoked_at).not.toBeNull();
    // The link is dead: the invited account cannot use it.
    await expect(acceptInvitation(invited, mailedToken(INVITED))).rejects.toThrow(Forbidden);

    // Accepted is not pending: removing that person is a membership action.
    const used = await invitationFor(STRANGER);
    expect(used.accepted_at).not.toBeNull();
    await expect(revokeInvitation(asUser(A), used.id)).rejects.toThrow();
    expect((await invitationFor(STRANGER)).revoked_at).toBeNull();
  });
});

describe('Story 6: Accept an invitation and land in the workspace.', () => {
  it('adds the membership at the invited role, stamps the invitation, and turns on workspace creation', async () => {
    const { createInvitation } = surface<InvitationWrites>(
      await coven(),
      ['createInvitation'],
      'M7.3',
    );
    const invited = await insertInvitee(INVITED);
    const [before] = await sql`
      select can_create_workspace from users where id = ${invited.userId}
    `;
    expect(before.can_create_workspace).toBe(false);
    // No seat yet: the workspace is refused to the invited person.
    await expect(assertMembership(invited, WORKSPACE_W_ID, { spell: ['read'] })).rejects.toThrow(
      Forbidden,
    );
    await createInvitation(asUser(A), WORKSPACE_W_ID, { email: INVITED, role: 'viewer' }, sender());

    const accepted = await acceptInvitation(invited, mailedToken(INVITED));

    expect(accepted).toMatchObject({ acceptedBy: invited.userId, workspaceId: WORKSPACE_W_ID });
    expect(accepted.acceptedAt).toBeInstanceOf(Date);
    const membership = await assertMembership(invited, WORKSPACE_W_ID, { spell: ['read'] });
    expect(membership.role).toBe('viewer');
    const [after] = await sql`select can_create_workspace from users where id = ${invited.userId}`;
    expect(after.can_create_workspace).toBe(true);
  });
});

describe('Story 7: Be rejected if a link is expired, revoked, or already used.', () => {
  it('refuses each with its own reason, and none names the workspace', async () => {
    // Through M7.3 and M7.6 rather than raw rows: MB.70's dead-link checks
    // already hold for a seeded row, so a raw setup would pass today.
    const { createInvitation } = surface<InvitationWrites>(
      await coven(),
      ['createInvitation'],
      'M7.3',
    );
    const { revokeInvitation } = surface<InvitationRevokes>(
      await coven(),
      ['revokeInvitation'],
      'M7.6',
    );
    const LATE = `late${INVITE_DOMAIN}`;
    const GONE = `gone${INVITE_DOMAIN}`;
    const invited = await insertInvitee(INVITED);
    const lateUser = await insertInvitee(LATE);
    const goneUser = await insertInvitee(GONE);
    for (const email of [INVITED, LATE, GONE]) {
      await createInvitation(asUser(A), WORKSPACE_W_ID, { email, role: 'member' }, sender());
    }
    const used = mailedToken(INVITED);
    const expired = mailedToken(LATE);
    const revoked = mailedToken(GONE);

    await acceptInvitation(invited, used);
    await sql`update invitations set expires_at = now() - interval '1 hour' where email = ${LATE}`;
    await revokeInvitation(asUser(A), (await invitationFor(GONE)).id);

    // Each account holds the matching verified address, so only the link is at fault.
    const expiredStanding = await invitationStanding(lateUser, expired);
    const revokedStanding = await invitationStanding(goneUser, revoked);
    const usedStanding = await invitationStanding(invited, used);
    expect(expiredStanding).toMatchObject({ acceptable: false, reason: 'expired' });
    expect(revokedStanding).toMatchObject({ acceptable: false, reason: 'revoked' });
    expect(usedStanding).toMatchObject({ acceptable: false, reason: 'accepted' });
    await expect(acceptInvitation(lateUser, expired)).rejects.toThrow(Forbidden);
    await expect(acceptInvitation(goneUser, revoked)).rejects.toThrow(Forbidden);
    await expect(acceptInvitation(invited, used)).rejects.toThrow(Forbidden);

    const [workspace] = await sql`select name from workspaces where id = ${WORKSPACE_W_ID}`;
    for (const standing of [expiredStanding, revokedStanding, usedStanding]) {
      expect(JSON.stringify(standing)).not.toContain(workspace.name as string);
    }
    // Neither refusal made a seat.
    await expect(assertMembership(lateUser, WORKSPACE_W_ID, { spell: ['read'] })).rejects.toThrow(
      Forbidden,
    );
  });
});

describe('Story 8: Switch between workspaces without losing my place.', () => {
  it('has a switcher, and a coven layout and index that resolve the workspace from the URL', () => {
    // The workspace comes from the `/coven/[slug]` segment, never the session,
    // so two tabs can disagree. What each renders is its own task's test.
    const paths = [
      ['M6.9', 'src/components/WorkspaceSwitcher/index.tsx'],
      ['M6.10', 'src/app/(shell)/coven/[slug]/layout.tsx'],
      ['M9.15', 'src/app/(shell)/coven/[slug]/page.tsx'],
    ] as const;
    for (const [task, path] of paths) {
      expect(existsSync(fromRoot(path)), `${task} has not built ${path} yet`).toBe(true);
    }
  });
});

describe("Story 9: See who's in a workspace and their roles.", () => {
  it('lists the members with their roles to an owner and a member, and refuses a viewer and a stranger', async () => {
    // The service behind the members page and `Workspace.members`; it reads the
    // coven's id and carries the row through, so the id is all the test needs.
    const listWorkspaceMembers = async (session: Session, workspaceId: string) =>
      (
        await listMembers(session, { id: workspaceId } as WorkspaceRow, {
          limit: 26,
          inverted: false,
        })
      ).map(({ node }) => node);

    const roles = (members: { userId: string; role: WorkspaceRole }[]) =>
      Object.fromEntries(members.map((member) => [member.userId, member.role]));
    const expected = { [A.id]: 'owner', [B.id]: 'member', [C.id]: 'viewer' };
    for (const reader of [A, B]) {
      expect(roles(await listWorkspaceMembers(asUser(reader), WORKSPACE_W_ID))).toEqual(expected);
    }

    // A viewer is refused by direct id, though a live membership exists: the
    // refusal is the `member: read` check, not a missing row (the page's 404).
    const [viewer] = await sql`
      select role from workspace_members
      where workspace_id = ${WORKSPACE_W_ID} and user_id = ${C.id} and deleted_at is null`;
    expect(viewer.role).toBe('viewer');
    await expect(listWorkspaceMembers(asUser(C), WORKSPACE_W_ID)).rejects.toThrow(Forbidden);

    // D belongs to X, so the members of W are the neighbouring coven's.
    await expect(listWorkspaceMembers(asUser(D), WORKSPACE_W_ID)).rejects.toThrow(Forbidden);
    expect(roles(await listWorkspaceMembers(asUser(D), WORKSPACE_X_ID))).toEqual({
      [D.id]: 'member',
    });
  });
});

describe('Story 10: Remove a member, or leave a workspace myself.', () => {
  it('lets an owner remove a member and a viewer leave, and refuses a member removing anyone', async () => {
    const covenId = await insertCoven('Fixture Coven Ten', [
      [A.id, 'owner'],
      [B.id, 'member'],
      [C.id, 'viewer'],
    ]);

    // Why each case is live: all three are admitted before anyone acts.
    for (const user of [A, B, C]) expect(await admitted(asUser(user), covenId)).toBe(true);

    const { removeMember, leaveWorkspace } = surface<MemberRemovals>(
      await coven(),
      ['removeMember', 'leaveWorkspace'],
      'M6.15',
    );

    // A member holds no `member: remove`, so the viewer stays.
    await expect(removeMember(asUser(B), covenId, C.id)).rejects.toThrow(Forbidden);
    expect(await liveRoles(covenId)).toHaveProperty(C.id);

    await removeMember(asUser(A), covenId, B.id);
    expect(await admitted(asUser(B), covenId)).toBe(false);

    // A viewer holds no `member` statement, and may still leave.
    await leaveWorkspace(asUser(C), covenId);
    expect(await admitted(asUser(C), covenId)).toBe(false);

    // Soft: the rows stay, marked, and only the leaver's and the removed's.
    expect(await liveRoles(covenId)).toEqual({ [A.id]: 'owner' });
    const [{ count }] = await sql`
      select count(*)::int as count from workspace_members where workspace_id = ${covenId}`;
    expect(count).toBe(3);
  });
});

describe('Story 11: Be blocked from removing the last owner.', () => {
  it('refuses every way the only owner could go, and lets one of two owners step down', async () => {
    const covenId = await insertCoven('Fixture Coven Eleven', [
      [A.id, 'owner'],
      [B.id, 'member'],
    ]);

    // Why the access could have succeeded: A holds `member: remove` and
    // `member: update`, and is the only owner there is.
    const before = await liveRoles(covenId);
    expect(Object.values(before).filter((role) => role === 'owner')).toHaveLength(1);
    expect(before[A.id]).toBe('owner');

    const { removeMember, leaveWorkspace } = surface<MemberRemovals>(
      await coven(),
      ['removeMember', 'leaveWorkspace'],
      'M6.15',
    );
    const { updateMemberRole } = surface<MemberRoles>(await coven(), ['updateMemberRole'], 'M9.14');

    // M6.8's guard. Its error class is that task's to choose, so only the refusal is asserted.
    await expect(removeMember(asUser(A), covenId, A.id)).rejects.toThrow();
    await expect(updateMemberRole(asUser(A), covenId, A.id, 'member')).rejects.toThrow();
    await expect(leaveWorkspace(asUser(A), covenId)).rejects.toThrow();
    expect(await liveRoles(covenId)).toEqual(before);

    // Two owners: each can be demoted down to one.
    await updateMemberRole(asUser(A), covenId, B.id, 'owner');
    await updateMemberRole(asUser(B), covenId, A.id, 'member');
    expect(await liveRoles(covenId)).toEqual({ [A.id]: 'member', [B.id]: 'owner' });
    await expect(updateMemberRole(asUser(B), covenId, B.id, 'member')).rejects.toThrow();
    expect((await liveRoles(covenId))[B.id]).toBe('owner');
  });
});

describe('Story 12: As a viewer, read everything in a workspace but change nothing.', () => {
  it('reads the ingredients and the grimoire, and every write is refused with nothing changed', async () => {
    const covenId = await insertCoven('Fixture Coven Twelve', [
      [A.id, 'owner'],
      [B.id, 'member'],
      [C.id, 'viewer'],
    ]);
    const fixture = makeIngredient({
      workspaceId: covenId,
      variants: [makeVariant({ form: 'Root' })],
      folkNames: ['Fixture Root'],
    });
    const ingredientId = await insertIngredient(sql, fixture, B.id);
    const spellId = await insertSpell(
      sql,
      makeSpell({ workspaceId: covenId, visibility: 'workspace' }),
      B.id,
    );
    const viewer = asUser(C);
    const [{ updated_at: ingredientStamp }] = await sql<Pick<Stamps, 'updated_at'>[]>`
      select updated_at from ingredients where id = ${ingredientId}`;

    // Why the writes below could have succeeded: the viewer is a live member of this coven.
    expect(await liveRoles(covenId)).toMatchObject({ [C.id]: 'viewer' });

    await expect(getWorkspaceIngredient(viewer, covenId, ingredientId)).resolves.toMatchObject({
      id: ingredientId,
    });

    // Ingredients: every write refused, by direct id.
    const {
      workspaceId: _tier,
      categories: _categories,
      substitutes: _substitutes,
      deities: _deities,
      ...input
    } = fixture;
    const values = { ...input, variants: input.variants.map((v) => variantInput(v)) };
    await expect(createWorkspaceIngredient(viewer, covenId, values)).rejects.toThrow(Forbidden);
    await expect(
      updateWorkspaceIngredient(viewer, covenId, ingredientId, {
        ...values,
        folkNames: ['Fixture Root', 'Fixture Taproot'],
      }),
    ).rejects.toThrow(Forbidden);
    await expect(deleteWorkspaceIngredient(viewer, covenId, ingredientId)).rejects.toThrow(
      Forbidden,
    );
    await expect(setSpellVisibility(viewer, covenId, spellId, 'workspace')).rejects.toThrow(
      Forbidden,
    );

    // Nothing moved.
    const [after] = await sql`
      select updated_at, deleted_at from ingredients where id = ${ingredientId}`;
    expect(after.updated_at).toEqual(ingredientStamp);
    expect(after.deleted_at).toBeNull();
    const [{ names }] = await sql`
      select count(*)::int as names from ingredient_folk_names where ingredient_id = ${ingredientId}`;
    expect(names).toBe(1);

    // The grimoire reads, and the coven's own writes: none built when this scaffold landed.
    const { getSpell } = surface<SpellReads>(
      await import('@/modules/grimoire'),
      ['getSpell'],
      'M10.5',
    );
    await expect(getSpell(viewer, covenId, spellId)).resolves.toMatchObject({ id: spellId });

    const { removeMember } = surface<MemberRemovals>(await coven(), ['removeMember'], 'M6.15');
    const { updateMemberRole } = surface<MemberRoles>(await coven(), ['updateMemberRole'], 'M9.14');
    const { deleteWorkspace } = surface<WorkspaceDeletion>(
      await coven(),
      ['deleteWorkspace'],
      'M6.14',
    );
    const { createInvitation } = surface<InvitationWrites>(
      await coven(),
      ['createInvitation'],
      'M7.3',
    );
    await expect(removeMember(viewer, covenId, B.id)).rejects.toThrow(Forbidden);
    await expect(updateMemberRole(viewer, covenId, B.id, 'viewer')).rejects.toThrow(Forbidden);
    await expect(
      createInvitation(viewer, covenId, { email: INVITED, role: 'member' }, sender()),
    ).rejects.toThrow(Forbidden);
    expect(send).not.toHaveBeenCalled();
    await expect(deleteWorkspace(viewer, covenId)).rejects.toThrow(Forbidden);

    expect(await liveRoles(covenId)).toEqual({
      [A.id]: 'owner',
      [B.id]: 'member',
      [C.id]: 'viewer',
    });
    const [{ deleted_at: closed }] = await sql`
      select deleted_at from workspaces where id = ${covenId}`;
    expect(closed).toBeNull();
  });
});

describe('Story 13: See who last edited a stock item and when.', () => {
  it("names the editor and the time the stock row's own stamps hold, after another member edits it", async () => {
    const covenId = await insertCoven('Fixture Coven Thirteen', [
      [A.id, 'owner'],
      [B.id, 'member'],
      [C.id, 'viewer'],
    ]);
    const ingredientId = await insertIngredient(
      sql,
      makeIngredient({ workspaceId: covenId, variants: [makeVariant({ form: 'Root' })] }),
      A.id,
    );
    const [variant] = await sql`
      select id from ingredient_variants where ingredient_id = ${ingredientId}`;
    const [stock] = await sql`
      insert into inventory_items (workspace_id, ingredient_id, variant_id, quantity_on_hand, created_by, updated_by)
      values (${covenId}, ${ingredientId}, ${variant.id}, 1, ${A.id}, ${A.id})
      returning id`;

    // Why this is story 13's case: A wrote the row, so the answer must change when B edits it.
    const [first] = await sql<Pick<Stamps, 'updated_by'>[]>`
      select updated_by from inventory_items where id = ${stock.id}`;
    expect(first.updated_by).toBe(A.id);

    const ingredients = await import('@/modules/ingredients');
    const { updateStockItem } = surface<StockEditor>(ingredients, ['updateStockItem'], 'M9.4');
    const { lastEditOfStockItem } = surface<StockEditor>(
      ingredients,
      ['lastEditOfStockItem'],
      'M6.18',
    );
    await updateStockItem(asUser(B), covenId, stock.id, { quantityOnHand: '2' });

    const [row] = await sql<Pick<Stamps, 'updated_by' | 'updated_at'>[]>`
      select updated_by, updated_at from inventory_items where id = ${stock.id}`;
    expect(row.updated_by).toBe(B.id);

    // Any member reads it, a viewer included: the same answer, the row's stamps.
    for (const reader of [A, C]) {
      const edit = await lastEditOfStockItem(asUser(reader), covenId, stock.id);
      expect(edit).toEqual({ userId: B.id, displayName: B.name, at: row.updated_at });
    }
  });
});
