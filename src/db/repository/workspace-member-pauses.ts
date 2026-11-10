import { and, eq, inArray, isNull } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';
import { workspaceMemberPauses } from '../../modules/coven/schema/workspace-member-pauses';
import type { Membership } from '@/modules/coven';
import { newestFirst, noEndOrAhead, notSoftDeleted, scopedTo } from './predicates';
import { closeThenInsertPause, liftedNow } from './pause-ledger';
import { findPageInWorkspace } from './finders';
import { selectFrom, selectOne } from './select';
import type { PageEntry, PageRequest } from '../../lib/types';
import type { AuditWriter, SortPart, WorkspaceMemberPauseRow, WriterContext } from './types';

/**
 * One member's live pause in the proof's coven: not lifted, and (by the writes' own filter, or `notSoftDeleted` in a read) not
 * deleted. The coven comes from the proof, never an argument (CLAUDE.md rule 5).
 */
const liveFor = (membership: Membership, userId: string): SQL | undefined =>
  and(
    scopedTo(membership, workspaceMemberPauses),
    eq(workspaceMemberPauses.userId, userId),
    isNull(workspaceMemberPauses.liftedAt),
  );

/**
 * The pause standing on a member's access to the proof's coven, or `undefined` when none does: live and not run out. A pause
 * whose `until` has passed reads as none, with no write.
 */
export function findStandingWorkspaceMemberPause(
  membership: Membership,
  userId: string,
): Promise<WorkspaceMemberPauseRow | undefined> {
  return selectOne(
    workspaceMemberPauses,
    and(
      notSoftDeleted(workspaceMemberPauses),
      liveFor(membership, userId),
      noEndOrAhead(workspaceMemberPauses.until),
    ),
  );
}

/**
 * The live pause with this id, in any coven, or `undefined`. For the mail job only: it carries a pause id and no proof, and
 * reads the pause to mail the member, never to authorise anything.
 */
export function findWorkspaceMemberPauseForMail(
  id: string,
): Promise<WorkspaceMemberPauseRow | undefined> {
  return selectOne(
    workspaceMemberPauses,
    and(notSoftDeleted(workspaceMemberPauses), eq(workspaceMemberPauses.id, id)),
  );
}

/**
 * The pauses standing on any of `userIds` in the proof's coven, one read for a page of the members list: live and not run out,
 * at most one per member.
 */
export function findStandingWorkspaceMemberPauses(
  membership: Membership,
  userIds: readonly string[],
): Promise<WorkspaceMemberPauseRow[]> {
  if (userIds.length === 0) return Promise.resolve([]);
  return selectFrom(
    workspaceMemberPauses,
    and(
      notSoftDeleted(workspaceMemberPauses),
      scopedTo(membership, workspaceMemberPauses),
      inArray(workspaceMemberPauses.userId, [...userIds]),
      isNull(workspaceMemberPauses.liftedAt),
      noEndOrAhead(workspaceMemberPauses.until),
    ),
  );
}

const HISTORY_ORDER: readonly SortPart[] = [newestFirst(workspaceMemberPauses.createdAt)];

/**
 * One page of the pauses set in the proof's coven, standing, run out and lifted alike, newest first (CLAUDE.md rule 8); one
 * member's alone when `userId` is given.
 */
export function findWorkspaceMemberPausePage(
  membership: Membership,
  page: PageRequest,
  userId?: string,
): Promise<PageEntry<WorkspaceMemberPauseRow>[]> {
  return findPageInWorkspace(
    membership,
    workspaceMemberPauses,
    HISTORY_ORDER,
    page,
    userId ? eq(workspaceMemberPauses.userId, userId) : undefined,
  );
}

export function workspaceMemberPauseWrites(
  context: WriterContext,
): Pick<AuditWriter, 'setWorkspaceMemberPause' | 'liftWorkspaceMemberPause'> {
  const { session, update } = context;
  return {
    // The live row is closed first, run out or standing, so the one-live index takes the new one. No conflict target: a pause
    // set for the same member in a transaction alongside wins the slot, and this call writes nothing rather than failing.
    setWorkspaceMemberPause: (membership, userId, { until, note, message }) =>
      closeThenInsertPause(context, workspaceMemberPauses, liveFor(membership, userId), {
        workspaceId: membership.workspaceId,
        userId,
        until,
        note,
        message,
      }),
    // A pause that has run out ended by itself, so it is left alone rather than recorded as a steward's lift.
    liftWorkspaceMemberPause: (membership, userId) =>
      update(
        workspaceMemberPauses,
        liftedNow(session),
        and(liveFor(membership, userId), noEndOrAhead(workspaceMemberPauses.until)),
      ),
  };
}
