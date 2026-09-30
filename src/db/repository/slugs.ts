import { and, eq, gt, ne, not } from 'drizzle-orm';
import { ingredients } from '../../modules/ingredients/schema/ingredients';
import { retiredIngredientSlugs } from '../../modules/ingredients/schema/retired-ingredient-slugs';
import { findOneIngredient } from './ingredients';
import { inCompendium, notSoftDeleted } from './predicates';
import { existsIn, selectFrom } from './select';
import type { IngredientRow, SlugRedirect } from './types';

// A compendium entry's addresses (claude-docs/db.md, "Ingredient slugs"): the
// slug it holds, and the slugs it moved off, each redirecting to it until the
// retirement's `expires_at`. `at` is the caller's clock rather than the
// database's, so a window is exact wherever it is read from.

/** The live compendium entry at `slug`, or `undefined`. */
export async function findCompendiumEntryBySlug(slug: string): Promise<IngredientRow | undefined> {
  const [row] = await selectFrom(
    ingredients,
    and(inCompendium(ingredients), notSoftDeleted(ingredients), eq(ingredients.slug, slug)),
  );
  return row;
}

/**
 * The live compendium entry that moved off `slug` most recently and whose
 * redirect from it is still running at `at` — `expires_at` after it, and no
 * live entry holding `slug` now — or `undefined`. `excluding` leaves one
 * entry out on both sides, as the one that moved and as the one holding the
 * slug: a write asks about every entry but the one it is writing, and the
 * entry at an address asks who moved off it.
 */
export async function findCompendiumSlugRedirect(
  slug: string,
  at: Date,
  excluding?: string,
): Promise<SlugRedirect | undefined> {
  const retirements = await selectFrom(
    retiredIngredientSlugs,
    and(
      inCompendium(retiredIngredientSlugs),
      notSoftDeleted(retiredIngredientSlugs),
      eq(retiredIngredientSlugs.slug, slug),
      gt(retiredIngredientSlugs.expiresAt, at),
      excluding === undefined ? undefined : ne(retiredIngredientSlugs.ingredientId, excluding),
      existsIn(
        ingredients,
        and(eq(ingredients.id, retiredIngredientSlugs.ingredientId), inCompendium(ingredients)),
      ),
      not(
        existsIn(
          ingredients,
          and(
            inCompendium(ingredients),
            eq(ingredients.slug, slug),
            excluding === undefined ? undefined : ne(ingredients.id, excluding),
          ),
        ),
      ),
    ),
  );
  const [latest] = retirements.sort((a, b) => b.retiredAt.getTime() - a.retiredAt.getTime());
  if (!latest) return undefined;

  // By id rather than joined, since `selectFrom` reads one table; an entry
  // deleted in between answers nothing.
  const entry = await findOneIngredient([], latest.ingredientId);
  return entry && { entry, expiresAt: latest.expiresAt };
}
