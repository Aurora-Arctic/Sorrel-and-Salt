import { and, eq, type SQL } from 'drizzle-orm';
import type { AnyPgColumn } from 'drizzle-orm/pg-core';
import { ingredientVariants } from '../../modules/ingredients/schema/ingredient-variants';
import { ingredients } from '../../modules/ingredients/schema/ingredients';
import type { Membership } from '@/modules/coven';
import { inTiers } from './predicates';
import { existsIn } from './select';

// The two tier predicates built on a query. Not in `predicates.ts`: `select.ts`
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
 * form of an ingredient owns takes the ingredient's tier (MB.218). Through the
 * variant rather than the row's own `ingredient_id`, so the form's tombstone
 * hides its rows as the ingredient's hides the ingredient's; the composite
 * key MB.217 built holds the two ids to one ingredient either way.
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
