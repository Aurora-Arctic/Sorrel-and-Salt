import { isNull } from 'drizzle-orm';
import { beginSeedTransaction, insertStamped, requireFrom } from './idempotent';
import { insertMissingReferences } from './reference-rows';
import { identityOf } from './standard';
import { COMPENDIUM } from './compendium/index';
import { checkCompendium } from './compendium/guard';
import {
  categoryRows,
  citing,
  deityRows,
  entryRow,
  foldForm,
  folkNameRows,
  pickedVariants,
  readPicks,
  substituteRows,
  substituteTargets,
  variantColumns,
  type Citing,
} from './compendium/rows';
import { WORKS } from './compendium/works';
import { ingredientSlug } from '../../lib/slugify';
import { ingredients } from '../../modules/ingredients/schema/ingredients';
import { ingredientVariants } from '../../modules/ingredients/schema/ingredient-variants';
import { ingredientFolkNames } from '../../modules/ingredients/schema/ingredient-folk-names';
import { ingredientDeities } from '../../modules/ingredients/schema/ingredient-deities';
import { ingredientCategories } from '../../modules/ingredients/schema/ingredient-categories';
import { ingredientSubstitutes } from '../../modules/ingredients/schema/ingredient-substitutes';
import { referenceLinks } from '../../modules/ingredients/schema/reference-links';
import type {
  SeedCompendiumEntry,
  SeedCompendiumShard,
  SeedCompendiumVariant,
  SeedDatabase,
  SeedTransaction,
} from './types';

// MB.242: the production compendium, seeded as reference data the way the
// curated vocabularies are — `migrate.yml` runs it after them and after the
// sources seed. Write-once per entry: the run that inserts an entry writes
// everything beneath it, and an entry already present is skipped with all
// of it, so a reseed never re-files a category an admin removed or puts back
// a form an admin deleted (claude-docs/db/compendium-seed/README.md,
// "Write-once, and how a correction lands"). Writes go through the handle
// the caller gives, not `withAudit` — see minimal.ts. The rows an entry
// becomes are built in ./compendium/rows.ts.

/** Throws, listing every issue, when `shards` fail the guard; writes nothing. */
export function assertCompendiumValid(shards: readonly SeedCompendiumShard[]): void {
  const issues = checkCompendium(shards);
  if (issues.length > 0) {
    throw new Error(`The compendium seed fails its guard:\n- ${issues.join('\n- ')}`);
  }
}

/**
 * Checks `shards` against the guard, then seeds them in a transaction of its
 * own. An issue throws before the transaction opens, so an invalid literal
 * writes nothing.
 */
export async function seedCompendium(
  db: SeedDatabase,
  shards: readonly SeedCompendiumShard[] = COMPENDIUM,
): Promise<void> {
  assertCompendiumValid(shards);
  await beginSeedTransaction(db, (tx) => seedCompendiumContent(tx, shards));
}

/**
 * The same seed inside a transaction the caller opened, after the curated
 * vocabularies it picks from. Present is any of: a row holding the entry's
 * seed key, live or deleted; a live compendium row of its identity; a live
 * compendium row at its slug. A present entry is untouched and nothing
 * beneath it written; a missing one is inserted whole, keyed. Assumes the GUC
 * is published and the bootstrap user exists.
 */
export async function seedCompendiumContent(
  tx: SeedTransaction,
  shards: readonly SeedCompendiumShard[],
): Promise<void> {
  const present = await presentEntries(tx);
  const missing = shards.flatMap((shard) =>
    shard.entries
      .filter(
        (entry) =>
          !present.has(identityOf(entry)) &&
          !present.has(slugKey(ingredientSlug(entry.name, entry.canonicalName))),
      )
      .map((entry) => ({ entry, sources: { ...WORKS, ...shard.sources } })),
  );
  if (missing.length === 0) return;

  const picks = await readPicks(tx);

  const inserted = await insertStamped(
    tx,
    ingredients,
    missing.map(({ entry }) => entryRow(entry, picks, null)),
  );
  const ingredientIds = new Map(inserted.map((row) => [row.seedKey as string, row.id]));
  const ingredientIdOf = (entry: SeedCompendiumEntry) =>
    requireFrom(ingredientIds, identityOf(entry), () => `${entry.name} was not inserted.`);

  // Each form whose curated pick is live, under the pick's current spelling.
  const picked = missing.flatMap(({ entry }) =>
    pickedVariants(entry, picks).map((variant) => ({ entry, ...variant })),
  );
  const variants = await insertStamped(
    tx,
    ingredientVariants,
    picked.map(({ entry, ...variant }) => ({
      ingredientId: ingredientIdOf(entry),
      ...variantColumns(variant, picks),
    })),
  );
  // Read back by entry and folded form, which the variant's unique index keys.
  const variantKey = (ingredientId: string, form: string) => `${ingredientId}|${foldForm(form)}`;
  const variantIds = new Map(
    variants.map((row) => [variantKey(row.ingredientId, row.form), row.id]),
  );
  const variantIdOf = new Map(
    picked.map(({ entry, variant, form }) => [
      variant,
      requireFrom(
        variantIds,
        variantKey(ingredientIdOf(entry), form.name),
        () => `${entry.name}'s ${form.name} was not inserted.`,
      ),
    ]),
  );
  /** Each of the entry's forms that was inserted, with its id. */
  const insertedVariants = (entry: SeedCompendiumEntry) =>
    entry.variants.flatMap((variant: SeedCompendiumVariant) => {
      const variantId = variantIdOf.get(variant);
      return variantId === undefined ? [] : [{ variant, variantId }];
    });

  await insertStamped(
    tx,
    ingredientFolkNames,
    missing.flatMap(({ entry }) => folkNameRows(entry, ingredientIdOf(entry))),
  );

  await insertStamped(
    tx,
    ingredientDeities,
    missing.flatMap(({ entry }) => deityRows(entry, ingredientIdOf(entry), picks)),
  );

  await insertStamped(
    tx,
    ingredientCategories,
    missing.flatMap(({ entry }) => {
      const ingredientId = ingredientIdOf(entry);
      return [
        ...categoryRows(entry.categories, ingredientId, null, picks),
        ...insertedVariants(entry).flatMap(({ variant, variantId }) =>
          categoryRows(variant.categories, ingredientId, variantId, picks),
        ),
      ];
    }),
  );

  const targets = await substituteTargets(tx);
  await insertStamped(
    tx,
    ingredientSubstitutes,
    missing.flatMap(({ entry }) => {
      const ingredientId = ingredientIdOf(entry);
      return [
        ...substituteRows(entry.substitutes, ingredientId, null, targets),
        ...insertedVariants(entry).flatMap(({ variant, variantId }) =>
          substituteRows(variant.substitutes, ingredientId, variantId, targets),
        ),
      ];
    }),
  );

  // The sources the inserted entries cite, then a link from each to the row
  // it supports. A source an admin soft-deleted is not linked anew.
  const cited: Citing[] = missing.flatMap(({ entry, sources }) => [
    ...citing(entry.references, sources, { ingredientId: ingredientIdOf(entry) }),
    ...insertedVariants(entry).flatMap(({ variant, variantId }) =>
      citing(variant.references, sources, { ingredientVariantId: variantId }),
    ),
  ]);
  const referenceIds = await insertMissingReferences(
    tx,
    cited.map(({ fields }) => fields),
  );
  await insertStamped(
    tx,
    referenceLinks,
    cited.flatMap(({ citation, text, owner }) => {
      const referenceId = referenceIds.get(text);
      return referenceId ? [{ referenceId, ...owner, locator: citation.locator ?? null }] : [];
    }),
  );
}

/** A slug's key in the present set, apart from the identities, which share its alphabet. */
const slugKey = (slug: string) => `slug:${slug}`;

/**
 * The compendium tier's present entries: every seed key, live or deleted;
 * every live identity; every live slug.
 */
async function presentEntries(tx: SeedTransaction): Promise<Set<string>> {
  const rows = await tx
    .select({
      seedKey: ingredients.seedKey,
      identityKey: ingredients.identityKey,
      slug: ingredients.slug,
      deletedAt: ingredients.deletedAt,
    })
    .from(ingredients)
    .where(isNull(ingredients.workspaceId));

  return new Set(
    rows.flatMap(({ seedKey, identityKey, slug, deletedAt }) => [
      ...(seedKey === null ? [] : [seedKey]),
      ...(deletedAt === null ? [identityKey, slugKey(slug)] : []),
    ]),
  );
}
