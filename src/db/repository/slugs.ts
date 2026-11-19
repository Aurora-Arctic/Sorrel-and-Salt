import { and, eq, gt, isNotNull, ne, not, type SQL } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { ingredients } from '../../modules/ingredients/schema/ingredients';
import { retiredIngredientSlugs } from '../../modules/ingredients/schema/retired-ingredient-slugs';
import { findOneIngredient } from './ingredients';
import { inCompendium, notSoftDeleted } from './predicates';
import { existsByKey, existsIn, selectFrom, selectOne } from './select';
import type { CompendiumSlugEntry, IngredientRow, SlugRedirect } from './types';

// A compendium entry's slugs and retired slugs (claude-docs/db/ingredient-slugs.md, "Ingredient slugs"); `at`
// is the caller's clock, not the database's.

/** What a slug read does with a hidden entry: left out unless the caller curates or is checking the address is free. */
export interface SlugReach {
  includeHidden?: boolean;
}

/** The compendium arm that leaves a hidden entry out, unless `includeHidden`. */
function shownOnly(reach: SlugReach | undefined): SQL | undefined {
  return reach?.includeHidden ? undefined : eq(ingredients.shown, true);
}

/** The live compendium entry at `slug`, or `undefined`. A hidden entry is `undefined` too, unless `includeHidden`. */
export function findCompendiumEntryBySlug(
  slug: string,
  reach?: SlugReach,
): Promise<IngredientRow | undefined> {
  return selectOne(
    ingredients,
    and(
      inCompendium(ingredients),
      notSoftDeleted(ingredients),
      eq(ingredients.slug, slug),
      shownOnly(reach),
    ),
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
  reach?: SlugReach,
): Promise<SlugRedirect | undefined> {
  const retirements = await selectFrom(
    retiredIngredientSlugs,
    and(
      inCompendium(retiredIngredientSlugs),
      notSoftDeleted(retiredIngredientSlugs),
      eq(retiredIngredientSlugs.slug, slug),
      gt(retiredIngredientSlugs.expiresAt, at),
      excluding === undefined ? undefined : ne(retiredIngredientSlugs.ingredientId, excluding),
      existsByKey(
        ingredients,
        ingredients.id,
        retiredIngredientSlugs.ingredientId,
        inCompendium(ingredients),
        shownOnly(reach),
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
 * change (claude-docs/db/updated-at.md). Deleted entries, hidden entries and every coven's rows are left out in SQL. `description` is for `llms.txt`; one cached, sessionless read.
 */
export async function findCompendiumSlugs(): Promise<CompendiumSlugEntry[]> {
  const rows = await selectFrom(
    ingredients,
    and(inCompendium(ingredients), notSoftDeleted(ingredients), eq(ingredients.shown, true)),
    // The five fields below and no others: the rest of a row is every other column of the table, unused here.
    { columns: ['slug', 'name', 'canonicalName', 'description', 'updatedAt'] },
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

// The same table read again, so each subquery can name the deleted row it is asked about.
const liveHolder = alias(ingredients, 'live_slug_holder');
const liveTarget = alias(ingredients, 'live_redirect_target');

/**
 * Every slug a deleted compendium entry left, A to Z, that the entry showed when it was deleted (a hidden entry's address was never public)
 * and that no live entry holds or redirects from now, since those addresses answer the live entry and a 410 would hide it.
 * It skips the entry's own tombstone filter and no other; its one caller is `listDeletedCompendiumSlugs`.
 */
export async function findDeletedCompendiumSlugsIncludingSoftDeleted(): Promise<string[]> {
  const rows = await selectFrom(
    ingredients,
    and(
      inCompendium(ingredients),
      isNotNull(ingredients.deletedAt),
      eq(ingredients.shown, true),
      not(
        existsIn(liveHolder, and(inCompendium(liveHolder), eq(liveHolder.slug, ingredients.slug))),
      ),
      not(
        existsIn(
          retiredIngredientSlugs,
          and(
            inCompendium(retiredIngredientSlugs),
            eq(retiredIngredientSlugs.slug, ingredients.slug),
            gt(retiredIngredientSlugs.expiresAt, new Date()),
            existsByKey(
              liveTarget,
              liveTarget.id,
              retiredIngredientSlugs.ingredientId,
              inCompendium(liveTarget),
            ),
          ),
        ),
      ),
    ),
    { columns: ['slug'] },
  );
  return [...new Set(rows.map(({ slug }) => slug))].sort((a, b) => a.localeCompare(b));
}
