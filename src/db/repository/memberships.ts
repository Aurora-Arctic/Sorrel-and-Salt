import { and, eq, inArray } from 'drizzle-orm';
import { workspaceMembers, workspaces } from '../../modules/coven/schema/workspaces';
// Type-only, so it is erased and no runtime cycle forms with the service that
// imports `findWorkspaceRole` below. The brand has to live beside the check
// that mints it (CLAUDE.md rule 1), which is why the direction is this way up.
import type { Membership, WorkspaceRole } from '@/modules/coven';
import type { PageEntry, PageRequest } from '../../lib/types';
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
 * they joined (M6.11). Its own finder rather than `findPageInWorkspace`,
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
 * The membership write that takes no proof, for the reason `findWorkspaceRole`
 * is the read that takes none: a proof is minted from a membership row, so
 * the row that makes a creator an owner, or an invitee a member, has none to
 * be written under. Spread into the writer beside `invitationWrites` (MB.198),
 * so it still runs inside `withAudit` and is stamped from the session. Narrow
 * on purpose — one row, the pair and the role named — and the caller decides
 * whether this user may be seated.
 */
export function membershipWrites({
  insert,
  update,
  tx,
}: WriterContext): Pick<
  AuditWriter,
  'insertMembership' | 'lockLiveMembers' | 'updateMembershipRole'
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
    insertMembership: (workspaceId, userId, role) =>
      insert(workspaceMembers, { workspaceId, userId, role }),
  };
}
