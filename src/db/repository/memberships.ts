import { and, eq, inArray, isNotNull, sql } from 'drizzle-orm';
import { workspaceMembers, workspaces } from '../../modules/coven/schema/workspaces';
import { users } from '../../modules/identity/schema/users';
// Type-only, so it is erased and no runtime cycle forms with the service that
// imports `findWorkspaceRole` below. The brand has to live beside the check
// that mints it (CLAUDE.md rule 1), which is why the direction is this way up.
import type { Membership, WorkspaceRole } from '@/modules/coven';
import type { PageEntry, PageRequest } from '../../lib/types';
import { applyAudit } from '../audit';
import { notSoftDeleted, scopedTo } from './predicates';
import { existsIn, pageBounds, selectFrom, selectOne } from './select';
import type { AuditWriter, Keyset, WriterContext } from './types';

/**
 * The one workspace-scoped read that takes no proof, because it mints one. Narrow on purpose (a role, not rows) so it
 * cannot stand in for a finder; the index's export list is pinned, so a second exception is a decision.
 */
export async function findWorkspaceRole(
  userId: string,
  workspaceId: string,
): Promise<WorkspaceRole | undefined> {
  const row = await selectOne(
    workspaceMembers,
    and(
      notSoftDeleted(workspaceMembers),
      eq(workspaceMembers.userId, userId),
      eq(workspaceMembers.workspaceId, workspaceId),
      // A deleted workspace admits no one, whatever their membership row says:
      // the rows stay live so a workspace restored by hand keeps its
      // members, and this check is what refuses every role at once.
      existsIn(workspaces, eq(workspaces.id, workspaceMembers.workspaceId)),
    ),
  );
  return row?.role;
}

/**
 * Every live membership each of these users holds, in a live workspace. A proofless
 * read: a user's memberships span workspaces, so the service decides whose ids may be
 * asked about, and the index's export list is pinned. (claude-docs/db/write-path.md, "Repository comments in full")
 */
export async function findMembershipsOfUsers(
  userIds: readonly string[],
): Promise<(typeof workspaceMembers.$inferSelect)[]> {
  if (userIds.length === 0) return [];
  return selectFrom(
    workspaceMembers,
    and(
      notSoftDeleted(workspaceMembers),
      inArray(workspaceMembers.userId, [...userIds]),
      existsIn(workspaces, eq(workspaces.id, workspaceMembers.workspaceId)),
    ),
  );
}

/**
 * One page of the live members of the proof's coven, in the order they joined. Its own finder, as a membership is
 * keyed on the pair, so the user id breaks ties instead of `id`.
 */
export function findMemberPage(
  membership: Membership,
  page: PageRequest,
): Promise<PageEntry<typeof workspaceMembers.$inferSelect>[]> {
  const keyset: Keyset = {
    sort: [workspaceMembers.joinedAt],
    id: workspaceMembers.userId,
    request: page,
  };
  return selectFrom(
    workspaceMembers,
    and(
      notSoftDeleted(workspaceMembers),
      scopedTo(membership, workspaceMembers),
      pageBounds(keyset),
    ),
    keyset,
  );
}

/**
 * The live member of the proof's coven who holds this address, or `undefined`, for the invite check. The address is
 * matched lower-cased against a live user row in SQL, so the roll is never fetched to be searched.
 */
export function findMemberByEmail(
  membership: Membership,
  email: string,
): Promise<typeof workspaceMembers.$inferSelect | undefined> {
  return selectOne(
    workspaceMembers,
    and(
      notSoftDeleted(workspaceMembers),
      scopedTo(membership, workspaceMembers),
      existsIn(
        users,
        and(
          eq(users.id, workspaceMembers.userId),
          eq(sql`lower(${users.email})`, email.toLowerCase()),
        ),
      ),
    ),
  );
}

/**
 * The address of each of these users holding a live seat in the proof's coven, for the owner's Email column; nothing else
 * of the row leaves the repository. Others are left out in SQL. The caller has checked `member: readEmail`, held by owners.
 */
export async function findMemberEmails(
  membership: Membership,
  userIds: readonly string[],
): Promise<Pick<(typeof users)['$inferSelect'], 'id' | 'email'>[]> {
  if (userIds.length === 0) return [];
  const rows = await selectFrom(
    users,
    and(
      notSoftDeleted(users),
      inArray(users.id, [...userIds]),
      existsIn(
        workspaceMembers,
        and(eq(workspaceMembers.userId, users.id), scopedTo(membership, workspaceMembers)),
      ),
    ),
  );
  return rows.map(({ id, email }) => ({ id, email }));
}

/**
 * Soft-deletes the workspace the proof names. Its own writer, as `softDeleteInWorkspace` scopes on a `workspace_id` that
 * `workspaces` lacks. Membership rows stay, as `findWorkspaceRole` stops admitting anyone. The caller has checked
 * `workspace: delete`; no row comes back for a workspace already deleted.
 */
export function workspaceWrites({
  softDelete,
}: WriterContext): Pick<AuditWriter, 'softDeleteWorkspace'> {
  return {
    softDeleteWorkspace: (membership) =>
      softDelete(workspaces, eq(workspaces.id, membership.workspaceId)),
  };
}

/**
 * The membership write that takes no proof, as `findWorkspaceRole` is the read that takes none: a proof is minted from a
 * membership row, so the row making a creator an owner has none to be written under. Still inside `withAudit`. One row,
 * the pair and role named; the caller decides whether this user may be seated.
 */
export function membershipWrites({
  insert,
  update,
  softDelete,
  tx,
  session,
}: WriterContext): Pick<
  AuditWriter,
  | 'insertMembership'
  | 'lockLiveMembers'
  | 'reviveMembership'
  | 'softDeleteMembership'
  | 'updateMembershipRole'
> {
  return {
    // In user-id order, so two changes at once queue on the first row rather
    // than each holding one the other wants (the order `lockLiveAdmins` uses).
    lockLiveMembers: (membership) =>
      selectFrom(
        workspaceMembers,
        and(notSoftDeleted(workspaceMembers), scopedTo(membership, workspaceMembers)),
        { lockIn: tx, lockOrder: workspaceMembers.userId },
      ),
    updateMembershipRole: (membership, userId, role) =>
      update(
        workspaceMembers,
        { role },
        and(scopedTo(membership, workspaceMembers), eq(workspaceMembers.userId, userId)),
      ),
    insertMembership: (workspaceId, userId, role, invitedBy) =>
      insert(workspaceMembers, { workspaceId, userId, role, invitedBy }),
    // Removal and leave alike: the proof's workspace scopes it, so
    // another coven's row is out of reach, and a row already deleted is
    // skipped, so a second removal never overwrites who made the first.
    softDeleteMembership: (membership, userId) =>
      softDelete(
        workspaceMembers,
        and(scopedTo(membership, workspaceMembers), eq(workspaceMembers.userId, userId)),
      ),
    // Rule 4's fourth named exception and the only writer touching a deleted row: the audit writer's `update` skips one,
    // and the `(workspace_id, user_id)` primary key stops a second insert. Deleted rows only (`isNotNull`), no proof (the seat
    // a proof comes from is being restored), and `joinedAt` restarts because the members list shows when it began.
    reviveMembership: (workspaceId, userId, role, invitedBy) => {
      const now = new Date();
      return tx
        .update(workspaceMembers)
        .set({
          ...applyAudit('update', { role, joinedAt: now, invitedBy }, session),
          deletedAt: null,
          deletedBy: null,
        })
        .where(
          and(
            eq(workspaceMembers.workspaceId, workspaceId),
            eq(workspaceMembers.userId, userId),
            isNotNull(workspaceMembers.deletedAt),
          ),
        )
        .returning();
    },
  };
}
