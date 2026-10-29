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
 * The reader rule as a predicate: the coven's shared spells plus this reader's private
 * ones. Exported for the repository's finders, not the index; the lint rule
 * `sorrel/spell-visibility-read-in-one-place` fails a visibility comparison elsewhere. (claude-docs/db/spell-visibility.md, "Reading: one predicate, nine finders, and why the generic ones refuse")
 */
export function readableSpells(membership: Membership): SQL | undefined {
  return and(
    scopedTo(membership, spells),
    notSoftDeleted(spells),
    or(eq(spells.visibility, 'workspace'), eq(spells.createdBy, membership.userId)),
  );
}

/**
 * The grimoire's Visibility facet, beside the rule that decides who reads so the one lint rule has one file to allow. Both are
 * ANDed after `readableSpells` and only narrow it: `visibilityIn` keeps spells holding any of `values`, `visibilityText` is the
 * column as text for the facet's count.
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
 * A spell's rows in `spell_steps` or `spell_categories`, readable exactly when the spell is. Neither table has a `workspace_id`,
 * so the correlated `EXISTS` over the parent supplies coven and visibility; filtering after the fetch would leak a jar (rule 7).
 */
export function findManyInSpell<TTable extends PgTable & SpellScoped & Unscoped>(
  membership: Membership,
  table: TTable,
  spellId: string,
): Promise<TTable['$inferSelect'][]> {
  return findManyInSpells(membership, table, [spellId]);
}

/**
 * The same, for many spells in one statement: a loader's batch read.
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
 * The ingredients among `ingredientIds` that a readable spell holds, soft-deleted ones included: the second escape hatch and the
 * only read returning a deleted ingredient, since a spell records a working (claude-docs/db/spell-visibility.md, "What a spell holds").
 * The spell and layer must be live and the ingredient the compendium's or the proof's coven's (a foreign key checks the id alone).
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
 * The live `ingredient_categories` or `ingredient_folk_names` rows of the ingredients a readable spell holds, deleted ones'
 * included, so derived categories stay what they were. Two statements, as `existsIn` filters a deleted parent.
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
 * The forms of the ingredients a readable spell holds, deleted or not, so a step still shows the form it laid: the third spell
 * hatch. It skips the form's own soft-delete filter only; the ingredient is read through the finder above. Category pairs need
 * no hatch, as `ingredient_categories` has no `deleted_at`.
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
 * The writes moving a coven's spell steps from one form to another, here because the ingredients module moves them and may not
 * import the grimoire's schema. Steps are read through their spell, scoped to the proof's coven and live; private spells are
 * not filtered out, since a step moves because its form is going. Only steps laying an ingredient name a form.
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
