import { and, eq, gt, isNull, or, sql } from 'drizzle-orm';
import { applyAudit } from '../audit';
import { userAccessPauses } from '../../modules/identity/schema/user-access-pauses';
import type { SiteAdmin } from '@/modules/identity';
import { notSoftDeleted } from './predicates';
import { selectFrom, selectOne } from './select';
import type { AuditWriter, UserAccessPauseRow, WriterContext } from './types';

/** A live pause's `until` is still ahead, or it has none: whether the pause stands rather than having run out. */
const notRunOut = or(isNull(userAccessPauses.until), gt(userAccessPauses.until, sql`now()`));

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
    and(notSoftDeleted(userAccessPauses), liveFor(userId), notRunOut),
  );
}

/** Every pause set on a user, standing, run out and lifted alike, newest first. Under the `SiteAdmin` proof: the history is an admin's. */
export async function findUserAccessPauses(
  _admin: SiteAdmin,
  userId: string,
): Promise<UserAccessPauseRow[]> {
  const rows = await selectFrom(
    userAccessPauses,
    and(notSoftDeleted(userAccessPauses), eq(userAccessPauses.userId, userId)),
  );
  // Ordered here because `selectFrom` orders only a keyset page; one user's pauses are a handful of rows.
  return rows.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

/** The site access pause's two named writes, beside its finders. `writerFor` spreads them into the writer. */
export function userAccessPauseWrites({
  tx,
  session,
  update,
}: WriterContext): Pick<AuditWriter, 'setUserAccessPause' | 'liftUserAccessPause'> {
  // `now()` beside the trigger's `updated_at`, so the two read alike.
  const lifted = () => ({ liftedAt: sql`now()`, liftedBy: session.userId });
  return {
    // The live row is closed first, run out or standing, so the one-live index takes the new one. No conflict target: a pause
    // set for the same user in a transaction alongside wins the slot, and this call writes nothing rather than failing.
    setUserAccessPause: async (_admin, userId, { until, note }) => {
      await update(userAccessPauses, lifted(), liveFor(userId));
      return tx
        .insert(userAccessPauses)
        .values(applyAudit('insert', { userId, until, note }, session) as never)
        .onConflictDoNothing()
        .returning();
    },
    // A pause that has run out ended by itself, so it is left alone rather than recorded as an admin's lift.
    liftUserAccessPause: (_admin, userId) =>
      update(userAccessPauses, lifted(), and(liveFor(userId), notRunOut)),
  };
}
