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
 * The one workspace-scoped read that takes no proof, because it is what mints
 * one: `assertMembership` has nothing to pass until this has answered. It is
 * narrow on purpose — a role, not rows — so it cannot stand in for a finder,
 * and the index's export list is pinned, so a second exception is a decision
 * rather than an addition.
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
 * Every live membership each of these users holds, in a workspace that is
 * itself live. The second read that takes no proof, and for the reason the
 * first does: a user's own memberships span workspaces, so there is no one
 * workspace to hold a proof for. The service calling it decides whose ids may
 * be asked about; the index's export list is pinned, so a third is a
 * decision.
 *
 * The workspace's own `deleted_at` is `existsIn`'s to check: a correlated
 * `EXISTS` rather than a join, so the rows come back in the membership's own
 * shape.
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
 * One page of the live members of the coven the proof names, in the order
 * they joined. Its own finder rather than `findPageInWorkspace`,
 * which breaks ties on a table's `id`: a membership is keyed on the pair,
 * so inside one coven the user id breaks them instead.
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
 * The live member of the proof's coven who holds this address, or `undefined`:
 * what the invite check reads to refuse inviting someone already inside.
 * The address is matched lower-cased against a live user row, in SQL, so the
 * coven's roll is never fetched to be searched.
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
 * The address of each of these users who holds a live seat in the proof's
 * coven, read off their own `users` row: the
 * owner's Email column. Nothing else of the row leaves
 * the repository. A user outside the coven, or removed from it, is left out
 * in SQL, so another coven's address is never fetched to be dropped. The
 * caller has checked `member: readEmail`, which only owners hold.
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
 * Soft-deletes the workspace the proof names. Its own writer rather
 * than `softDeleteInWorkspace`, which scopes on a `workspace_id` column that
 * `workspaces` does not have: its own `id` is the workspace. The membership
 * rows are left as they were, since `findWorkspaceRole` stops admitting
 * anyone once the workspace is gone. The caller has checked `workspace: delete`.
 * No row comes back for a workspace already deleted.
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
 * The membership write that takes no proof, for the reason `findWorkspaceRole`
 * is the read that takes none: a proof is minted from a membership row, so
 * the row that makes a creator an owner, or an invitee a member, has none to
 * be written under. Spread into the writer beside `invitationWrites`,
 * so it still runs inside `withAudit` and is stamped from the session. Narrow
 * on purpose — one row, the pair and the role named — and the caller decides
 * whether this user may be seated.
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
    // Rule 4's fourth named exception, and
    // the only writer that touches a deleted row: the audit writer's `update`
    // skips one by design, and the pair `(workspace_id, user_id)` is the
    // primary key, so a person invited back cannot be inserted a second time.
    // It reaches deleted rows only (`isNotNull`), so no live seat is rewritten.
    // Takes no proof for `insertMembership`'s reason: the seat a proof is
    // minted from is the one being restored. `joinedAt` restarts, because the
    // members list shows when this membership began.
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
