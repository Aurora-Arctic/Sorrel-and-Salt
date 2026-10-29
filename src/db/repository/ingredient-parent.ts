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
 * The ingredient `childColumn` names is readable as `readableInTiers` reads one, and holds `where`: how a child table with no
 * `workspace_id` takes its parent's tier, so another coven's ingredient gets no rows, not a filter after the fetch (rule 7). A correlated
 * `EXISTS` that ANDs the parent's tombstone filter; `where` reads the parent as `ingredients`.
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
 * The live variant `variantColumn` names belongs to a readable ingredient (which holds `where`): how a row one form owns takes the
 * ingredient's tier. Through the variant, not the row's `ingredient_id`, so the form's tombstone hides its rows.
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
 * `readableIngredientParent`, or a compendium entry the curators have retired while
 * `heldBy`'s coven has a live cupboard entry naming it. One `EXISTS` over the parent,
 * so it skips `existsIn`'s tombstone filter and restores it on the first arm. (claude-docs/db/write-path.md, "Repository comments in full")
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
 * `readableVariantParent`, or a live form of a retired compendium entry `heldBy`'s cupboard names, as `inUseIngredientParent`
 * admits one, so its forms and jars stay readable to the covens using it. No `heldBy` is `readableVariantParent`'s read.
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
