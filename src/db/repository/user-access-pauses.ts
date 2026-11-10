import { and, eq, inArray, isNull } from 'drizzle-orm';
import { sessions } from '../../modules/identity/schema/auth';
import { userAccessPauses } from '../../modules/identity/schema/user-access-pauses';
import type { SiteAdmin } from '@/modules/identity';
import { newestFirst, noEndOrAhead, notSoftDeleted } from './predicates';
import { closeThenInsertPause, liftedNow, standingPause } from './pause-ledger';
import { findPage } from './finders';
import { selectFrom, selectOne, whenIds } from './select';
import type { PageEntry, PageRequest } from '../../lib/types';
import type { AuditWriter, SortPart, UserAccessPauseRow, WriterContext } from './types';

/** A pause stands: not lifted, and not run out. The column read and the user list's filter share it. */
export const pauseStands = standingPause(userAccessPauses);

/** One user's live pause: not lifted, and (by the writes' own filter, or `notSoftDeleted` in a read) not deleted. */
const liveFor = (userId: string) =>
  and(eq(userAccessPauses.userId, userId), isNull(userAccessPauses.liftedAt));

/**
 * The pause standing on a user's access, or `undefined` when none does: live and not run out. Takes no proof, since sign-in reads
 * it before there is a session to make one from. A pause whose `until` has passed reads as none, with no write.
 */
export function findStandingUserAccessPause(
  userId: string,
): Promise<UserAccessPauseRow | undefined> {
  return selectOne(
    userAccessPauses,
    and(notSoftDeleted(userAccessPauses), liveFor(userId), noEndOrAhead(userAccessPauses.until)),
  );
}

/**
 * The pause standing on each of these users, by the same test as `findStandingUserAccessPause`, in one query: the user
 * list's Site Access Paused column for a page of users. Under the `SiteAdmin` proof: who is paused is a keeper's to read.
 */
export function findStandingUserAccessPausesFor(
  _admin: SiteAdmin,
  userIds: readonly string[],
): Promise<UserAccessPauseRow[]> {
  return whenIds(userIds, () =>
    selectFrom(
      userAccessPauses,
      and(
        notSoftDeleted(userAccessPauses),
        inArray(userAccessPauses.userId, [...userIds]),
        pauseStands,
      ),
    ),
  );
}

// A user's pauses, newest first.
const HISTORY_ORDER: readonly SortPart[] = [newestFirst(userAccessPauses.createdAt)];

/**
 * One page of every pause set on a user, standing, run out and lifted alike, newest first (CLAUDE.md rule 8). Under the
 * `SiteAdmin` proof: the history is a keeper's.
 */
export function findUserAccessPausePage(
  _admin: SiteAdmin,
  userId: string,
  page: PageRequest,
): Promise<PageEntry<UserAccessPauseRow>[]> {
  return findPage(userAccessPauses, HISTORY_ORDER, page, eq(userAccessPauses.userId, userId));
}

/** The site access pause's two named writes, beside its finders. `writerFor` spreads them into the writer. */
export function userAccessPauseWrites(
  context: WriterContext,
): Pick<AuditWriter, 'setUserAccessPause' | 'liftUserAccessPause'> {
  const { tx, session, update } = context;
  return {
    // Ends the user's sessions in the same transaction as the pause.
    setUserAccessPause: async (_admin, userId, { until, note, message }) => {
      await tx.delete(sessions).where(eq(sessions.userId, userId));
      return closeThenInsertPause(context, userAccessPauses, liveFor(userId), {
        userId,
        until,
        note,
        message,
      });
    },
    // A pause that has run out ended by itself, so it is left alone rather than recorded as a keeper's lift.
    liftUserAccessPause: (_admin, userId) =>
      update(
        userAccessPauses,
        liftedNow(session),
        and(liveFor(userId), noEndOrAhead(userAccessPauses.until)),
      ),
  };
}
