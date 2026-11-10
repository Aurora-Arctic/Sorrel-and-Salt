import { and, eq, inArray, isNotNull, isNull, sql } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';
import { workspaceMembers, workspaces } from '../../modules/coven/schema/workspaces';
import { workspaceSlugs } from '../../modules/coven/schema/workspace-slugs';
import { workspaceMemberPauses } from '../../modules/coven/schema/workspace-member-pauses';
import { users } from '../../modules/identity/schema/users';
// Type-only, so it is erased and no runtime cycle forms with the service that
// imports `findWorkspaceRole` below. The brand has to live beside the check
// that mints it (CLAUDE.md rule 1), which is why the direction is this way up.
import type { Membership, WorkspaceRole, WorkspaceSeat } from '@/modules/coven';
import type { PageEntry, PageRequest } from '../../lib/types';
import { containsText, noEndOrAhead, notSoftDeleted, scopedTo } from './predicates';
import { existsIn, pageBounds, selectFrom, selectOne } from './select';
import type { AuditWriter, Keyset, WriterContext } from './types';

/** The standing pause on a seat: unlifted, undeleted and not run out. The one-live index allows one per seat, so joining it adds no row. */
const standingPauseOnSeat = and(
  eq(workspaceMemberPauses.workspaceId, workspaceMembers.workspaceId),
  eq(workspaceMemberPauses.userId, workspaceMembers.userId),
  isNull(workspaceMemberPauses.liftedAt),
  notSoftDeleted(workspaceMemberPauses),
  noEndOrAhead(workspaceMemberPauses.until),
) as SQL;

/**
 * The one workspace-scoped read that takes no proof, because it mints one: the user's role in the workspace and the pause
 * standing on it, in one query. Narrow on purpose (a role and a pause, not rows) so it cannot stand in for a finder; the index's
 * export list is pinned, so a second exception is a decision. A pause run out, lifted or deleted reads as none.
 */
export async function findWorkspaceSeat(
  userId: string,
  workspaceId: string,
): Promise<WorkspaceSeat | undefined> {
  const [found] = await selectFrom(
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
    { leftJoin: workspaceMemberPauses, on: standingPauseOnSeat },
  );
  if (!found) return undefined;
  return { role: found.row.role, pause: found.joined ? { until: found.joined.until } : null };
}

/**
 * The user's role in the workspace, paused or not: a paused member still holds the seat. For the callers that ask whether a
 * seat is taken (invitations, a steward acting on a member); `assertMembership` reads the whole seat.
 */
export async function findWorkspaceRole(
  userId: string,
  workspaceId: string,
): Promise<WorkspaceRole | undefined> {
  return (await findWorkspaceSeat(userId, workspaceId))?.role;
}

/**
 * Every live membership each of these users holds, in a live workspace, with the pause standing on each seat or null, in
 * the same query. A proofless read: a user's memberships span workspaces, so the service decides whose ids may be
 * asked about, and the index's export list is pinned. (claude-docs/db/write-path.md, "Reads that take no proof")
 */
export async function findMembershipsOfUsers(
  userIds: readonly string[],
): Promise<(typeof workspaceMembers.$inferSelect & Pick<WorkspaceSeat, 'pause'>)[]> {
  if (userIds.length === 0) return [];
  const rows = await selectFrom(
    workspaceMembers,
    and(
      notSoftDeleted(workspaceMembers),
      inArray(workspaceMembers.userId, [...userIds]),
      existsIn(workspaces, eq(workspaces.id, workspaceMembers.workspaceId)),
    ),
    { leftJoin: workspaceMemberPauses, on: standingPauseOnSeat },
  );
  return rows.map(({ row, joined }) => ({
    ...row,
    pause: joined ? { until: joined.until } : null,
  }));
}

/**
 * One page of the live members of the proof's coven, in the order they joined, narrowed by `query` to those whose live
 * user row's name holds it, case-insensitively. Its own finder, as a membership is keyed on the pair, so the user id
 * breaks ties instead of `id`.
 */
export function findMemberPage(
  membership: Membership,
  page: PageRequest,
  query?: string,
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
      query
        ? existsIn(
            users,
            and(eq(users.id, workspaceMembers.userId), containsText(users.name, query)),
          )
        : undefined,
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
 * The address of each of these users holding a live seat in the proof's coven, for the steward's Email column; nothing else
 * of the row leaves the repository. Others are left out in SQL. The caller has checked `member: readEmail`, held by stewards.
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
    // The coven's addresses go with it, which frees them for another coven.
    softDeleteWorkspace: async (membership) => {
      const rows: unknown[] = await softDelete(
        workspaces,
        eq(workspaces.id, membership.workspaceId),
      );
      if (rows.length > 0) {
        await softDelete(workspaceSlugs, eq(workspaceSlugs.workspaceId, membership.workspaceId));
      }
      return rows as never;
    },
  };
}

/**
 * The membership write that takes no proof, as `findWorkspaceRole` is the read that takes none: a proof is minted from a
 * membership row, so the row making a creator a steward has none to be written under. Still inside `withAudit`. One row,
 * the pair and role named; the caller decides whether this user may be seated.
 */
export function membershipWrites({
  insert,
  update,
  softDelete,
  tx,
  stampUpdate,
}: WriterContext): Pick<
  AuditWriter,
  | 'insertMembership'
  | 'lockLiveMembers'
  | 'reviveMembership'
  | 'setSeatRole'
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
    setSeatRole: (workspaceId, userId, role) =>
      update(
        workspaceMembers,
        { role },
        and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, userId)),
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
          ...stampUpdate({ role, joinedAt: now, invitedBy }),
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
