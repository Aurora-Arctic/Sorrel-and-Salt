import { and, isNull, sql, type SQL } from 'drizzle-orm';
import type { AnyPgColumn, PgTable } from 'drizzle-orm/pg-core';
import type { AuditSession } from '../types';
import { noEndOrAhead } from './predicates';
import type { WriterContext } from './types';

/** The two columns every pause table (access, coven member, support time-out) shares. */
type PauseTable = PgTable & { liftedAt: AnyPgColumn; until: AnyPgColumn };

/** The pause stands: not lifted, and its `until` still ahead or absent, so a pause that ran out reads as none with no write. */
export function standingPause(table: PauseTable): SQL {
  return and(isNull(table.liftedAt), noEndOrAhead(table.until)) as SQL;
}

/** A lift's values. `now()` beside the trigger's `updated_at`, so the two read alike. */
export function liftedNow(session: AuditSession) {
  return { liftedAt: sql`now()`, liftedBy: session.userId };
}

/**
 * Closes the live pause `liveWhere` names, then opens the new one. No conflict target: a pause set alongside in another
 * transaction wins the one-live slot, and this writes nothing rather than failing.
 */
export async function closeThenInsertPause<TTable extends PauseTable>(
  { tx, session, update, stampInsert }: WriterContext,
  table: TTable,
  liveWhere: SQL | undefined,
  values: object,
): Promise<TTable['$inferSelect'][]> {
  await update(table, liftedNow(session), liveWhere);
  return (await tx
    .insert(table)
    .values(stampInsert(values))
    .onConflictDoNothing()
    .returning()) as TTable['$inferSelect'][];
}
