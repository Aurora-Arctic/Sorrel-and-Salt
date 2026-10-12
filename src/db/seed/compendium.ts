import { and, isNotNull, isNull } from 'drizzle-orm';
import { beginSeedTransaction, insertStamped, requireFrom } from './idempotent';
import { insertMissingReferences } from './reference-rows';
import { identityOf } from './standard';
import { COMPENDIUM } from './compendium/index';
import { checkCompendium } from './compendium/guard';
import { WORKS } from './compendium/works';
import { citationText } from '../../lib/citation';
import { ingredientSlug, slugify } from '../../lib/slugify';
import { ingredients } from '../../modules/ingredients/schema/ingredients';
import { ingredientVariants } from '../../modules/ingredients/schema/ingredient-variants';
import { ingredientFolkNames } from '../../modules/ingredients/schema/ingredient-folk-names';
import { ingredientDeities } from '../../modules/ingredients/schema/ingredient-deities';
import { ingredientCategories } from '../../modules/ingredients/schema/ingredient-categories';
import { ingredientSubstitutes } from '../../modules/ingredients/schema/ingredient-substitutes';
import { referenceLinks } from '../../modules/ingredients/schema/reference-links';
import { categories } from '../../modules/vocabulary/schema/categories';
import { deities } from '../../modules/vocabulary/schema/deities';
import { ingredientForms } from '../../modules/vocabulary/schema/ingredient-forms';
import { celestialBodies, zodiacSigns } from '../../modules/vocabulary/schema/astrology';
import type { CitationFields } from '../../lib/types';
import type {
  SeedCitation,
  SeedCompendiumEntry,
  SeedCompendiumShard,
  SeedCompendiumVariant,
  SeedDatabase,
  SeedSubstitute,
  SeedTransaction,
} from './types';

// MB.242: the production compendium, seeded as reference data the way the
// curated vocabularies are — `migrate.yml` runs it after them and after the
// sources seed. Write-once per entry: the run that inserts an entry writes
// everything beneath it, and an entry already present is skipped with all
// of it, so a reseed never re-files a category an admin removed or puts back
// a form an admin deleted (claude-docs/db/compendium-seed/README.md,
// "Write-once, and how a correction lands"). Writes go through the handle
// the caller gives, not `withAudit` — see minimal.ts.

/** A curated row a literal names, by the key its seed gave it: its id and current spelling, or `null` once retired. */
type CuratedPick = { id: string; name: string } | null;

/**
 * Checks `shards` against the guard, then seeds them in a transaction of its
 * own. An issue throws before the transaction opens, so an invalid literal
 * writes nothing.
 */
export async function seedCompendium(
  db: SeedDatabase,
  shards: readonly SeedCompendiumShard[] = COMPENDIUM,
): Promise<void> {
  const issues = checkCompendium(shards);
  if (issues.length > 0) {
    throw new Error(`The compendium seed fails its guard:\n- ${issues.join('\n- ')}`);
  }
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

  const picks = {
    forms: await picksBySeedKey(tx, ingredientForms),
    categories: await picksBySeedKey(tx, categories),
    deities: await picksBySeedKey(tx, deities),
    celestialBodies: await picksBySeedKey(tx, celestialBodies),
    zodiacSigns: await picksBySeedKey(tx, zodiacSigns),
  };
  const pick = (kind: keyof typeof picks, name: string) =>
    requireFrom(
      picks[kind],
      slugify(name),
      () => `A compendium entry names ${kind} "${name}", which no seed wrote.`,
    );
  // A celestial body or sign is stored as its row's current spelling (MB.162); a
  // retired one is left off.
  const spelled = (
    kind: 'celestialBodies' | 'zodiacSigns',
    values: readonly string[] | null | undefined,
  ) => {
    const names = (values ?? []).flatMap((value) => pick(kind, value)?.name ?? []);
    return names.length > 0 ? names : null;
  };

  const inserted = await insertStamped(
    tx,
    ingredients,
    missing.map(({ entry }) => ({
      workspaceId: null,
      name: entry.name,
      canonicalName: entry.canonicalName ?? null,
      nomenclature: entry.nomenclature,
      slug: ingredientSlug(entry.name, entry.canonicalName),
      description: entry.description ?? null,
      elements: entry.elements ?? null,
      celestialBodies: spelled('celestialBodies', entry.celestialBodies),
      zodiacSigns: spelled('zodiacSigns', entry.zodiacSigns),
      colors: entry.colors ?? null,
      safetyNotes: entry.safetyNotes ?? null,
      seedKey: identityOf(entry),
    })),
  );
  const ingredientIds = new Map(inserted.map((row) => [row.seedKey as string, row.id]));
  const ingredientIdOf = (entry: SeedCompendiumEntry) =>
    requireFrom(ingredientIds, identityOf(entry), () => `${entry.name} was not inserted.`);

  // Each form whose curated pick is live, under the pick's current spelling.
  const variantRows = missing.flatMap(({ entry }) =>
    entry.variants.flatMap((variant) => {
      const form = pick('forms', variant.form);
      return form === null ? [] : [{ entry, variant, form }];
    }),
  );
  const variants = await insertStamped(
    tx,
    ingredientVariants,
    variantRows.map(({ entry, variant, form }) => ({
      ingredientId: ingredientIdOf(entry),
      form: form.name,
      formId: form.id,
      description: variant.description ?? null,
      safetyNotes: variant.safetyNotes ?? null,
      elements: variant.elements ?? null,
      celestialBodies: spelled('celestialBodies', variant.celestialBodies),
      zodiacSigns: spelled('zodiacSigns', variant.zodiacSigns),
      colors: variant.colors ?? null,
    })),
  );
  // Read back by entry and folded form, which the variant's unique index keys.
  const variantKey = (ingredientId: string, form: string) =>
    `${ingredientId}|${form.toLowerCase()}`;
  const variantIds = new Map(
    variants.map((row) => [variantKey(row.ingredientId, row.form), row.id]),
  );
  const variantIdOf = new Map(
    variantRows.map(({ entry, variant, form }) => [
      variant,
      requireFrom(
        variantIds,
        variantKey(ingredientIdOf(entry), form.name),
        () => `${entry.name}'s ${form.name} was not inserted.`,
      ),
    ]),
  );

  await insertStamped(
    tx,
    ingredientFolkNames,
    missing.flatMap(({ entry }) =>
      (entry.folkNames ?? []).map((name) => ({ ingredientId: ingredientIdOf(entry), name })),
    ),
  );

  await insertStamped(
    tx,
    ingredientDeities,
    missing.flatMap(({ entry }) =>
      (entry.deities ?? [])
        .flatMap((name) => pick('deities', name) ?? [])
        .map((deity, position) => ({
          ingredientId: ingredientIdOf(entry),
          deityId: deity.id,
          name: deity.name,
          position,
        })),
    ),
  );

  await insertStamped(
    tx,
    ingredientCategories,
    missing.flatMap(({ entry }) => [
      ...(entry.categories ?? []).flatMap((name) => {
        const category = pick('categories', name);
        return category === null
          ? []
          : [{ ingredientId: ingredientIdOf(entry), variantId: null, categoryId: category.id }];
      }),
      ...entry.variants.flatMap((variant) => {
        const variantId = variantIdOf.get(variant);
        if (variantId === undefined) return [];
        return (variant.categories ?? []).flatMap((name) => {
          const category = pick('categories', name);
          return category === null
            ? []
            : [{ ingredientId: ingredientIdOf(entry), variantId, categoryId: category.id }];
        });
      }),
    ]),
  );

  const targets = await substituteTargets(tx);
  await insertStamped(
    tx,
    ingredientSubstitutes,
    missing.flatMap(({ entry }) => {
      const ingredientId = ingredientIdOf(entry);
      return [
        ...substituteRows(entry.substitutes, ingredientId, null, targets),
        ...entry.variants.flatMap((variant) => {
          const variantId = variantIdOf.get(variant);
          return variantId === undefined
            ? []
            : substituteRows(variant.substitutes, ingredientId, variantId, targets);
        }),
      ];
    }),
  );

  // The sources the inserted entries cite, then a link from each to the row
  // it supports. A source an admin soft-deleted is not linked anew.
  const cited = (
    citations: readonly SeedCitation<string>[],
    sources: Record<string, CitationFields>,
  ) =>
    citations.map((citation) => ({
      citation,
      fields: requireFrom(
        new Map(Object.entries(sources)),
        citation.source,
        () => `A compendium entry cites "${citation.source}", which no work declares.`,
      ),
    }));
  const citing = missing.flatMap(({ entry, sources }) => [
    ...cited(entry.references, sources).map((cite) => ({
      ...cite,
      key: { ingredientId: ingredientIdOf(entry) },
    })),
    ...entry.variants.flatMap((variant: SeedCompendiumVariant) => {
      const variantId = variantIdOf.get(variant);
      return variantId === undefined
        ? []
        : cited(variant.references, sources).map((cite) => ({
            ...cite,
            key: { ingredientVariantId: variantId },
          }));
    }),
  ]);
  const referenceIds = await insertMissingReferences(
    tx,
    citing.map(({ fields }) => fields),
  );
  await insertStamped(
    tx,
    referenceLinks,
    citing.flatMap(({ citation, fields, key }) => {
      const referenceId = referenceIds.get(citationText(fields));
      return referenceId ? [{ referenceId, ...key, locator: citation.locator ?? null }] : [];
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

/** A curated table's seeded rows by `seed_key`: the id and current name, or `null` when retired. */
async function picksBySeedKey(
  tx: SeedTransaction,
  table:
    | typeof ingredientForms
    | typeof categories
    | typeof deities
    | typeof celestialBodies
    | typeof zodiacSigns,
): Promise<Map<string, CuratedPick>> {
  const rows = await tx
    .select({ id: table.id, name: table.name, seedKey: table.seedKey, deletedAt: table.deletedAt })
    .from(table)
    .where(isNotNull(table.seedKey));

  return new Map(
    rows.map((row) => [
      row.seedKey as string,
      row.deletedAt === null ? { id: row.id, name: row.name } : null,
    ]),
  );
}

/** A substitute's possible targets: each live compendium entry by seed key and by identity, with its live forms. */
interface SubstituteTarget {
  id: string;
  variants: Map<string, string>;
}

async function substituteTargets(tx: SeedTransaction): Promise<Map<string, SubstituteTarget>> {
  const rows = await tx
    .select({
      id: ingredients.id,
      seedKey: ingredients.seedKey,
      identityKey: ingredients.identityKey,
    })
    .from(ingredients)
    .where(and(isNull(ingredients.workspaceId), isNull(ingredients.deletedAt)));
  const forms = await tx
    .select({
      id: ingredientVariants.id,
      ingredientId: ingredientVariants.ingredientId,
      form: ingredientVariants.form,
    })
    .from(ingredientVariants)
    .where(isNull(ingredientVariants.deletedAt));

  const byIngredient = new Map<string, Map<string, string>>();
  for (const form of forms) {
    const own = byIngredient.get(form.ingredientId) ?? new Map<string, string>();
    own.set(slugify(form.form), form.id);
    byIngredient.set(form.ingredientId, own);
  }
  const targets = new Map<string, SubstituteTarget>();
  for (const row of rows) {
    const target = { id: row.id, variants: byIngredient.get(row.id) ?? new Map() };
    targets.set(row.identityKey, target);
    if (row.seedKey !== null) targets.set(row.seedKey, target);
  }
  return targets;
}

/** An `ingredient_substitutes` row before its stamps. */
type SubstituteRow = Pick<
  typeof ingredientSubstitutes.$inferInsert,
  'ingredientId' | 'variantId' | 'substituteId' | 'substituteVariantId' | 'name'
>;

/**
 * The rows a list of substitutes writes: a typed name as it is; a link to
 * the entry its identity names, and to the form when that form is live. A
 * link whose entry is gone is left off, as a retired pick is.
 */
function substituteRows(
  substitutes: readonly SeedSubstitute[] | undefined,
  ingredientId: string,
  variantId: string | null,
  targets: Map<string, SubstituteTarget>,
): SubstituteRow[] {
  return (substitutes ?? []).flatMap((substitute): SubstituteRow[] => {
    if (!('identity' in substitute)) {
      return [
        {
          ingredientId,
          variantId,
          substituteId: null,
          substituteVariantId: null,
          name: substitute.name,
        },
      ];
    }
    const target = targets.get(substitute.identity);
    if (target === undefined) return [];
    const substituteVariantId =
      substitute.form === undefined
        ? null
        : (target.variants.get(slugify(substitute.form)) ?? null);
    return [{ ingredientId, variantId, substituteId: target.id, substituteVariantId, name: null }];
  });
}
