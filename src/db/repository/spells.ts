import { and, eq, or, type SQL } from 'drizzle-orm';
import type { PgTable } from 'drizzle-orm/pg-core';
import { spells } from '../../modules/grimoire/schema/spells';
import type { Membership } from '@/modules/coven';
import { existsIn, selectFrom } from './select';
import { notSoftDeleted, scopedTo, type SpellScoped, type Unscoped } from './shapes';

/**
 * §5's reader rule, as a predicate: the coven's own spells, shared ones plus
 * this reader's private ones. `created_by` is the author — §5 gives spells no
 * separate author column — so the proof supplies both halves and a caller has
 * no id to pass that could disagree with it.
 */
function readableSpells(membership: Membership): SQL | undefined {
  return and(
    scopedTo(membership, spells),
    notSoftDeleted(spells),
    or(eq(spells.visibility, 'workspace'), eq(spells.createdBy, membership.userId)),
  );
}

/** Every spell of this coven this member may read. */
export function findManySpells(membership: Membership): Promise<(typeof spells.$inferSelect)[]> {
  return selectFrom(spells, readableSpells(membership));
}

/**
 * One spell by id, or `undefined` — which is also the answer for another
 * coven's spell and for a private spell that is not this reader's. A caller
 * holding an id it saw elsewhere learns nothing from the difference.
 */
export async function findOneSpell(
  membership: Membership,
  spellId: string,
): Promise<typeof spells.$inferSelect | undefined> {
  const [row] = await selectFrom(spells, and(readableSpells(membership), eq(spells.id, spellId)));
  return row;
}

/**
 * A spell's rows in `spell_ingredients` or `spell_categories` — readable
 * exactly when the spell is. Neither table carries a `workspace_id` to scope
 * itself by, so the correlated `EXISTS` over the parent is where both the
 * coven and the visibility come from; filtering after the fetch would hand a
 * caller the contents of a jar it may not open (rule 7).
 */
export function findManyInSpell<TTable extends PgTable & SpellScoped & Unscoped>(
  membership: Membership,
  table: TTable,
  spellId: string,
): Promise<TTable['$inferSelect'][]> {
  return selectFrom(
    table,
    and(
      notSoftDeleted(table),
      eq(table.spellId, spellId),
      existsIn(spells, and(eq(spells.id, table.spellId), readableSpells(membership))),
    ),
  );
}
