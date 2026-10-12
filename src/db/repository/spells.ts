import { and, eq, inArray, or, type SQL } from 'drizzle-orm';
import type { PgTable } from 'drizzle-orm/pg-core';
import { spellIngredients } from '../../modules/grimoire/schema/spell-ingredients';
import { spells } from '../../modules/grimoire/schema/spells';
import { ingredients } from '../../modules/ingredients/schema/ingredients';
import type { Membership } from '@/modules/coven';
import { inTiers, notSoftDeleted, scopedTo } from './predicates';
import { existsIn, selectFrom, selectOne } from './select';
import type {
  IngredientRow,
  IngredientScoped,
  NotSpellScoped,
  SpellScoped,
  Unscoped,
} from './types';

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
export function findOneSpell(
  membership: Membership,
  spellId: string,
): Promise<typeof spells.$inferSelect | undefined> {
  return selectOne(spells, and(readableSpells(membership), eq(spells.id, spellId)));
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

/**
 * The ingredients among `ingredientIds` that a spell this member may read
 * holds — soft-deleted ones included. The second escape hatch, and the only
 * read that returns a deleted ingredient: a spell is a record of a working, so
 * what went into the jar stays in it (claude-docs/db/spell-visibility.md, "What a spell holds").
 * Everything else still filters. The spell must be readable and live, the
 * layer live, and the ingredient in the compendium or the proof's coven — a
 * layer's foreign key checks the id alone, so the tier is held here.
 */
export function findIngredientsInSpellsIncludingSoftDeleted(
  membership: Membership,
  ingredientIds: readonly string[],
): Promise<IngredientRow[]> {
  if (ingredientIds.length === 0) return Promise.resolve([]);
  return selectFrom(
    ingredients,
    and(
      inArray(ingredients.id, [...ingredientIds]),
      inTiers([membership], ingredients),
      existsIn(
        spellIngredients,
        and(
          eq(spellIngredients.ingredientId, ingredients.id),
          existsIn(
            spells,
            and(eq(spells.id, spellIngredients.spellId), readableSpells(membership)),
          ),
        ),
      ),
    ),
  );
}

/**
 * The live rows of `ingredient_categories` or `ingredient_folk_names` of the
 * ingredients a readable spell holds, the deleted ones' included — so a
 * spell's derived categories stay what they were. The child's own tombstone
 * still filters. Two statements: the parent is read through the finder above,
 * because `existsIn` filters a deleted parent by construction.
 */
export async function findManyOfSpellIngredientsIncludingSoftDeleted<
  TTable extends PgTable & IngredientScoped & Unscoped & NotSpellScoped,
>(
  membership: Membership,
  table: TTable,
  ingredientIds: readonly string[],
): Promise<TTable['$inferSelect'][]> {
  const held = await findIngredientsInSpellsIncludingSoftDeleted(membership, ingredientIds);
  if (held.length === 0) return [];
  return selectFrom(
    table,
    and(
      notSoftDeleted(table),
      inArray(
        table.ingredientId,
        held.map((row) => row.id),
      ),
    ),
  );
}
