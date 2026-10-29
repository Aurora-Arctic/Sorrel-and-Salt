import { and, eq, or, type SQL } from 'drizzle-orm';
import type { AnyPgColumn } from 'drizzle-orm/pg-core';
import { ingredientVariants } from '../../modules/ingredients/schema/ingredient-variants';
import { ingredients } from '../../modules/ingredients/schema/ingredients';
import { workspaceCompendiumEntries } from '../../modules/ingredients/schema/workspace-compendium-entries';
import type { Membership } from '@/modules/coven';
import { inCompendium, inTiers, notSoftDeleted, scopedTo } from './predicates';
import { existsIn, existsInIncludingSoftDeleted } from './select';

// The tier predicates built on a query. Not in `predicates.ts`: `select.ts`
// imports that file, so a predicate there built on `existsIn` would make the
// two import each other. Not in `select.ts` either, which builds queries for
// any table and names none.

/**
 * The ingredient `childColumn` names is readable, as `readableInTiers` reads
 * one, and holds `where` too: how a child table with no `workspace_id` of its
 * own takes its parent's tier, so a caller naming another coven's ingredient
 * gets no rows rather than a filter applied after the fetch (rule 7). A
 * correlated `EXISTS`, whose builder ANDs the parent's tombstone filter; `where`
 * reads the parent as `ingredients`, so a child compares its own tier with it.
 */
export function readableIngredientParent(
  memberships: readonly Membership[],
  childColumn: AnyPgColumn,
  where?: SQL,
): SQL {
  return existsIn(
    ingredients,
    and(eq(ingredients.id, childColumn), inTiers(memberships, ingredients), where),
  );
}

/**
 * The live variant `variantColumn` names belongs to a readable ingredient, as
 * `readableIngredientParent` reads one, which holds `where` too: how a row one
 * form of an ingredient owns takes the ingredient's tier. Through the
 * variant rather than the row's own `ingredient_id`, so the form's tombstone
 * hides its rows as the ingredient's hides the ingredient's; the composite
 * key holds the two ids to one ingredient either way.
 */
export function readableVariantParent(
  memberships: readonly Membership[],
  variantColumn: AnyPgColumn,
  where?: SQL,
): SQL {
  return existsIn(
    ingredientVariants,
    and(
      eq(ingredientVariants.id, variantColumn),
      readableIngredientParent(memberships, ingredientVariants.ingredientId, where),
    ),
  );
}

/**
 * `readableIngredientParent`, or a compendium entry the curators have retired
 * while `heldBy`'s coven has a live cupboard entry naming it: an
 * entry a coven still uses, which the compendium no longer lists. The tier is
 * checked whatever the tombstone, so a cupboard row naming a coven's own
 * ingredient, which the table does not refuse, admits nothing. One `EXISTS`
 * over the parent, which is why it skips `existsIn`'s tombstone filter and
 * puts it back on the first arm. `where` reads the parent as `ingredients`,
 * as `readableIngredientParent`'s does; a retired entry's tier is the
 * compendium's (claude-docs/db/workspace-compendium-entries.md, "When the
 * compendium retires the entry"). No `heldBy` is `readableIngredientParent`
 * itself, so a finder takes the proof as an optional last argument.
 */
export function inUseIngredientParent(
  memberships: readonly Membership[],
  childColumn: AnyPgColumn,
  heldBy: Membership | undefined,
  where?: SQL,
): SQL {
  if (!heldBy) return readableIngredientParent(memberships, childColumn, where);
  return existsInIncludingSoftDeleted(
    ingredients,
    and(
      eq(ingredients.id, childColumn),
      or(
        and(notSoftDeleted(ingredients), inTiers(memberships, ingredients)),
        and(
          inCompendium(ingredients),
          existsIn(
            workspaceCompendiumEntries,
            and(
              eq(workspaceCompendiumEntries.ingredientId, ingredients.id),
              scopedTo(heldBy, workspaceCompendiumEntries),
            ),
          ),
        ),
      ),
      where,
    ),
  );
}

/**
 * `readableVariantParent`, or a live form of a retired compendium entry
 * `heldBy`'s cupboard names, as `inUseIngredientParent` admits one: the
 * entry's forms and jars stay readable to the covens that use it. The form's
 * own tombstone still filters. No `heldBy` is `readableVariantParent`'s read.
 */
export function inUseVariantParent(
  memberships: readonly Membership[],
  variantColumn: AnyPgColumn,
  heldBy: Membership | undefined,
  where?: SQL,
): SQL {
  return existsIn(
    ingredientVariants,
    and(
      eq(ingredientVariants.id, variantColumn),
      inUseIngredientParent(memberships, ingredientVariants.ingredientId, heldBy, where),
    ),
  );
}
