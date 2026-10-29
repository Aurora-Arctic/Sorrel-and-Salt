import { and, eq, inArray, or, type SQL, sql } from 'drizzle-orm';
import type { PgTable } from 'drizzle-orm/pg-core';
import { spellSteps } from '../../modules/grimoire/schema/spell-steps';
import { spells } from '../../modules/grimoire/schema/spells';
import { ingredientVariants } from '../../modules/ingredients/schema/ingredient-variants';
import { ingredients } from '../../modules/ingredients/schema/ingredients';
import type { Membership } from '@/modules/coven';
import { inTiers, notSoftDeleted, scopedTo } from './predicates';
import { existsIn, selectFrom, selectOne } from './select';
import type {
  AuditWriter,
  IngredientRow,
  IngredientScoped,
  NotSpellScoped,
  SpellScoped,
  Unscoped,
  WriterContext,
} from './types';

/**
 * §5's reader rule, as a predicate: the coven's own spells, shared ones plus
 * this reader's private ones. `created_by` is the author — §5 gives spells no
 * separate author column — so the proof supplies both halves and a caller has
 * no id to pass that could disagree with it.
 *
 * Exported for the repository's own finders — M13.5's and M13.6's workings
 * reach their spell through it — and not from the index: above the
 * repository nothing builds SQL (MB.33). It builds a condition and runs
 * nothing, and the lint rule `sorrel/spell-visibility-read-in-one-place` fails a
 * `spells.visibility` comparison written anywhere else.
 */
export function readableSpells(membership: Membership): SQL | undefined {
  return and(
    scopedTo(membership, spells),
    notSoftDeleted(spells),
    or(eq(spells.visibility, 'workspace'), eq(spells.createdBy, membership.userId)),
  );
}

/**
 * The grimoire's Visibility facet (M13.22), beside the rule that decides who
 * reads so the one lint rule has one file to allow. Neither decides who may
 * read: both are ANDed after `readableSpells`, so they only narrow what it
 * lets through. `visibilityIn` keeps the spells holding any of `values`;
 * `visibilityText` is the column as text, for the facet's grouped count.
 */
export const visibilityIn = (values: readonly (typeof spells.$inferSelect)['visibility'][]): SQL =>
  inArray(spells.visibility, [...values]);
export const visibilityText = sql<string>`${spells.visibility}::text`;

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
 * A spell's rows in `spell_steps` or `spell_categories` — readable
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
  return findManyInSpells(membership, table, [spellId]);
}

/**
 * The same, for many spells in one statement: a loader's batch read (M10.9).
 * A spell among `spellIds` the reader may not read contributes no rows, so a
 * batch that names one learns nothing of it.
 */
export function findManyInSpells<TTable extends PgTable & SpellScoped & Unscoped>(
  membership: Membership,
  table: TTable,
  spellIds: readonly string[],
): Promise<TTable['$inferSelect'][]> {
  if (spellIds.length === 0) return Promise.resolve([]);
  return selectFrom(
    table,
    and(
      notSoftDeleted(table),
      inArray(table.spellId, [...spellIds]),
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
        spellSteps,
        and(
          eq(spellSteps.ingredientId, ingredients.id),
          existsIn(spells, and(eq(spells.id, spellSteps.spellId), readableSpells(membership))),
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

/**
 * The forms of the ingredients a readable spell holds, deleted or not, so a
 * step whose form was deleted still shows the form it laid (M10.9). The third
 * spell escape hatch, beside M5.3's two. It skips the form's own soft-delete
 * filter and no other: the ingredient is read through the finder above, which
 * holds the spell, the layer and the tier. A form's category pairs need no
 * hatch of their own: `ingredient_categories` has no `deleted_at`, and a
 * form's soft delete leaves its pairs in place.
 */
export async function findFormsInSpellsIncludingSoftDeleted(
  membership: Membership,
  ingredientIds: readonly string[],
): Promise<(typeof ingredientVariants.$inferSelect)[]> {
  const held = await findIngredientsInSpellsIncludingSoftDeleted(membership, ingredientIds);
  if (held.length === 0) return [];
  return selectFrom(
    ingredientVariants,
    inArray(
      ingredientVariants.ingredientId,
      held.map((row) => row.id),
    ),
  );
}

/**
 * The writes that move a coven's spell steps from one form to another
 * (M12.21), spread into the writer. Here rather than in the grimoire module,
 * because the ingredients module moves them and may not import the
 * grimoire's schema; the repository belongs to no module. Every step is read
 * through its spell, scoped to the proof's coven and live, so another coven's
 * steps are never touched. Private spells are not filtered out: a step is
 * moved because its form is going, whoever may read the spell. Only a step
 * that lays an ingredient names a form, so only those are touched.
 */
export function spellStepWrites({
  tx,
  update,
  softDelete,
}: WriterContext): Pick<
  AuditWriter,
  'lockStepsOfVariants' | 'moveSteps' | 'softDeleteSpell' | 'softDeleteStepsOfSpell'
> {
  const inCovenSpell = (membership: Membership) =>
    existsIn(spells, and(eq(spells.id, spellSteps.spellId), scopedTo(membership, spells)));
  return {
    lockStepsOfVariants: (membership, variantIds) => {
      if (variantIds.length === 0) return Promise.resolve([]);
      return selectFrom(
        spellSteps,
        and(
          notSoftDeleted(spellSteps),
          inArray(spellSteps.variantId, [...variantIds]),
          inCovenSpell(membership),
        ),
        { lockIn: tx, lockOrder: spellSteps.id },
      );
    },
    moveSteps: (membership, stepIds, to) => {
      if (stepIds.length === 0) return Promise.resolve([]);
      return update(
        spellSteps,
        { ingredientId: to.ingredientId, variantId: to.variantId },
        and(inArray(spellSteps.id, [...stepIds]), inCovenSpell(membership)),
      );
    },
    // Deleting a spell (M13.11): the spell under the reader's rule, so a
    // private spell goes only for its author, and its steps under the coven's
    // scope, as the steps of a spell this writer has already matched.
    softDeleteSpell: (membership, spellId) =>
      softDelete(spells, and(readableSpells(membership), eq(spells.id, spellId))),
    softDeleteStepsOfSpell: (membership, spellId) =>
      softDelete(spellSteps, and(eq(spellSteps.spellId, spellId), inCovenSpell(membership))),
  };
}
