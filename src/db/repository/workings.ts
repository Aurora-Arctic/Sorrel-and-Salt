import { and, eq, inArray, sql } from 'drizzle-orm';
import { spellWorkingDeductions } from '../../modules/grimoire/schema/spell-working-deductions';
import { spellWorkingParticipants } from '../../modules/grimoire/schema/spell-working-participants';
import { spellWorkings } from '../../modules/grimoire/schema/spell-workings';
import { spells } from '../../modules/grimoire/schema/spells';
import type { Membership } from '@/modules/coven';
import { applyAudit } from '../audit';
import { scopedTo } from './predicates';
import { existsIn, selectFrom } from './select';
import { readableWorkings } from './spells';
import type {
  AuditWriter,
  WorkingCount,
  WorkingDeductionRow,
  WorkingParticipantRow,
  WorkingRow,
  WriterContext,
} from './types';

// A spell's workings, read under `readableWorkings`: the spell must be readable and a private working reaches its recorder and the
// members named on it. The participant and deduction tables have no coven and no tombstone, so they are read through their working.

/** One working by id, or `undefined` for a missing, deleted or unreadable one: the same answer for all three. */
export async function findOneWorking(
  membership: Membership,
  workingId: string,
): Promise<WorkingRow | undefined> {
  const [row] = await selectFrom(
    spellWorkings,
    and(readableWorkings(membership), eq(spellWorkings.id, workingId)),
  );
  return row;
}

/** A spell's workings the reader may read, newest day first (then newest recorded). */
export async function findWorkingsInSpell(
  membership: Membership,
  spellId: string,
): Promise<WorkingRow[]> {
  const rows = await selectFrom(
    spellWorkings,
    and(readableWorkings(membership), eq(spellWorkings.spellId, spellId)),
  );
  return rows.sort(
    (a, b) => b.workedOn.localeCompare(a.workedOn) || b.createdAt.getTime() - a.createdAt.getTime(),
  );
}

/** How many complete workings the reader may read of each spell, for the spells that have any: absent means none. */
export function findCompleteWorkingCounts(
  membership: Membership,
  spellIds: readonly string[],
): Promise<WorkingCount[]> {
  if (spellIds.length === 0) return Promise.resolve([]);
  return selectFrom(
    spellWorkings,
    and(
      readableWorkings(membership),
      eq(spellWorkings.status, 'complete'),
      inArray(spellWorkings.spellId, [...spellIds]),
    ),
    {
      aggregate: {
        spellId: sql<string>`${spellWorkings.spellId}`,
        count: sql<number>`count(*)::int`,
      },
      over: {},
      groupBy: [spellWorkings.spellId],
    },
  );
}

/** The participants of these workings, each working's in the order they were entered, for the workings the reader may read. */
export async function findParticipantsOfWorkings(
  membership: Membership,
  workingIds: readonly string[],
): Promise<WorkingParticipantRow[]> {
  if (workingIds.length === 0) return [];
  const rows = await selectFrom(
    spellWorkingParticipants,
    and(
      inArray(spellWorkingParticipants.workingId, [...workingIds]),
      existsIn(
        spellWorkings,
        and(eq(spellWorkings.id, spellWorkingParticipants.workingId), readableWorkings(membership)),
      ),
    ),
  );
  return rows.sort((a, b) => a.position - b.position);
}

/** The deductions of these workings, for the workings the reader may read. */
export async function findDeductionsOfWorkings(
  membership: Membership,
  workingIds: readonly string[],
): Promise<WorkingDeductionRow[]> {
  if (workingIds.length === 0) return [];
  return selectFrom(
    spellWorkingDeductions,
    and(
      inArray(spellWorkingDeductions.workingId, [...workingIds]),
      existsIn(
        spellWorkings,
        and(eq(spellWorkings.id, spellWorkingDeductions.workingId), readableWorkings(membership)),
      ),
    ),
  );
}

/**
 * The writes a working needs beyond the generic ones: completing it, replacing its participants, and deleting a spell's workings,
 * each under a proof, as the coven's scope reaches a working through its spell.
 */
export function workingWrites({
  tx,
  session,
  update,
  softDelete,
}: WriterContext): Pick<
  AuditWriter,
  'completeWorking' | 'replaceWorkingParticipants' | 'softDeleteWorkingsOfSpell'
> {
  return {
    // Only a draft completes, in the UPDATE's own WHERE, so two completions racing leave one winner and the other gets no row.
    completeWorking: (membership, workingId) =>
      update(
        spellWorkings,
        { status: 'complete', completedAt: sql`now()` },
        and(
          readableWorkings(membership),
          eq(spellWorkings.id, workingId),
          eq(spellWorkings.status, 'draft'),
        ),
      ),
    // The rows are replaced wholesale: the table keeps no tombstone, so the old ones are removed. The working is checked under
    // the proof first, and nothing is written for one the proof cannot reach.
    replaceWorkingParticipants: async (membership, workingId, participants) => {
      const [working] = await selectFrom(
        spellWorkings,
        and(readableWorkings(membership), eq(spellWorkings.id, workingId)),
        { lockIn: tx, lockOrder: spellWorkings.id },
      );
      if (!working) return [];
      await tx
        .delete(spellWorkingParticipants)
        .where(eq(spellWorkingParticipants.workingId, workingId));
      const written: WorkingParticipantRow[] = [];
      for (const [position, participant] of participants.entries()) {
        const [row] = await tx
          .insert(spellWorkingParticipants)
          .values(
            applyAudit(
              'insert',
              {
                workingId,
                userId: participant.userId ?? null,
                name: participant.name ?? null,
                position,
              },
              session,
            ) as never,
          )
          .returning();
        written.push(row as WorkingParticipantRow);
      }
      return written;
    },
    // Every live working of the spell, whoever recorded it and whatever its visibility: a deleted spell takes its workings.
    softDeleteWorkingsOfSpell: (membership, spellId) =>
      softDelete(
        spellWorkings,
        and(
          eq(spellWorkings.spellId, spellId),
          existsIn(spells, and(eq(spells.id, spellWorkings.spellId), scopedTo(membership, spells))),
        ),
      ),
  };
}
