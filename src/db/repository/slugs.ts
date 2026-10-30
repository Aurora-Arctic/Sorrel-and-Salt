import { and, eq, gt, ne, not } from 'drizzle-orm';
import { ingredients } from '../../modules/ingredients/schema/ingredients';
import { retiredIngredientSlugs } from '../../modules/ingredients/schema/retired-ingredient-slugs';
import { findOneIngredient } from './ingredients';
import { inCompendium, notSoftDeleted } from './predicates';
import { existsIn, selectFrom, selectOne } from './select';
import type { CompendiumSlugEntry, IngredientRow, SlugRedirect } from './types';

// A compendium entry's addresses (claude-docs/db/ingredient-slugs.md, "Ingredient slugs"): the
// slug it holds, and the slugs it moved off, each redirecting to it until the
// retirement's `expires_at`. `at` is the caller's clock rather than the
// database's, so a window is exact wherever it is read from.

/** The live compendium entry at `slug`, or `undefined`. */
export function findCompendiumEntryBySlug(slug: string): Promise<IngredientRow | undefined> {
  return selectOne(
    ingredients,
    and(inCompendium(ingredients), notSoftDeleted(ingredients), eq(ingredients.slug, slug)),
  );
}

/**
 * The live compendium entry that most recently moved off `slug` and whose redirect from it still runs at `at` (`expires_at` after it,
 * no live entry holding `slug` now), or `undefined`. `excluding` leaves one entry out on both sides, so a write asks about every entry but its own.
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

/**
 * Every live compendium entry's address, by name, for the sitemap and `llms.txt`. `lastModified` is `updated_at`, which moves only on a real
 * change (claude-docs/db/updated-at.md). Deleted entries and every coven's rows are left out in SQL. `description` is for `llms.txt`; one cached, sessionless read.
 */
export async function findCompendiumSlugs(): Promise<CompendiumSlugEntry[]> {
  const rows = await selectFrom(
    ingredients,
    and(inCompendium(ingredients), notSoftDeleted(ingredients)),
  );
  return rows
    .map(({ slug, name, canonicalName, description, updatedAt }) => ({
      slug,
      name,
      canonicalName,
      description,
      lastModified: updatedAt,
    }))
    .sort((a, b) => a.name.localeCompare(b.name) || a.slug.localeCompare(b.slug));
}
