import { isNull } from 'drizzle-orm';
import { beginSeedTransaction, insertStamped, requireFrom } from './idempotent';
import { insertMissingReferences } from './reference-rows';
import { identityOf } from './coven-content';
import { checkCompendiumFiles } from './compendium/guard';
import { loadCompendium, readConversionManifest, type LoadedCompendium } from './compendium/load';
import { emptyReport, type SeedCompendiumReport } from './compendium/report';
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
import {
  adoptHash,
  applyUpdate,
  decide,
  readReferenceTexts,
  readStates,
  type SeedItem,
} from './compendium/update';
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
  SeedCompendiumVariant,
  SeedDatabase,
  SeedTransaction,
} from './types';

// The production compendium, seeded as reference data after the curated vocabularies and the sources. An absent entry is
// inserted whole with its content hash; a present one is left alone unless its file is marked for update (claude-docs/db/
// compendium-seed/README.md, "Write-once, and how a correction lands"). Rows are ./compendium/rows.ts's, decisions ./compendium/update.ts's.

export interface SeedCompendiumOptions {
  /**
   * The conversion manifest, identity to hash (load.ts). `seedCompendium`
   * reads `compendium/.converted-hashes.json` when it is not given one;
   * `seedCompendiumContent` adopts nothing unless given one.
   */
  manifest?: Record<string, string> | null;
  /** Decide and report, then roll the transaction back. */
  dryRun?: boolean;
  /** Updates every marked entry the guard would refuse (curator reviewed, edited on the site, a child edited, no baseline) as if it said `overwriteEditor: true`. */
  force?: boolean;
}

/** Throws, listing every issue, when the files fail the guard (with what the loader could not read); writes nothing. */
export function assertCompendiumValid(input: LoadedCompendium): void {
  const issues = [...input.issues, ...checkCompendiumFiles(input)];
  if (issues.length > 0) {
    throw new Error(`The compendium seed fails its guard:\n- ${issues.join('\n- ')}`);
  }
}

/**
 * Each entry the seed writes, with where it came from and its hash: the
 * `approved` files only, each with its mark. A `draft` or `needs-review`
 * file is not seeded, wherever it runs.
 */
export function seedItems(input: LoadedCompendium): SeedItem[] {
  const sources = { ...WORKS, ...input.sources };
  return input.files
    .filter((file) => file.status === 'approved')
    .map((file) => ({
      entry: file.entry,
      sources,
      where: file.path,
      hash: file.hash,
      seedUpdate: file.seedUpdate,
      overwriteEditor: file.overwriteEditor,
    }));
}

/**
 * Checks `input` (by default the files under `compendium/`) against the guard, then seeds it in a transaction of its own and
 * returns what the run did. An issue throws before the transaction opens; a dry run rolls back after deciding.
 */
export async function seedCompendium(
  db: SeedDatabase,
  input: LoadedCompendium = loadCompendium(),
  {
    manifest = readConversionManifest(),
    dryRun = false,
    force = false,
  }: SeedCompendiumOptions = {},
): Promise<SeedCompendiumReport> {
  assertCompendiumValid(input);
  return beginSeedTransaction(db, (tx) => seedCompendiumContent(tx, input, { manifest, force }), {
    dryRun,
  });
}

/**
 * The same seed inside the caller's transaction, after the vocabularies it picks from. Present is a row holding the entry's seed
 * key (live or deleted), a live compendium row of its identity, or one at its slug. A missing entry is inserted whole; a present
 * one is decided by `decide`. Assumes the GUC is published and the bootstrap user exists.
 */
export async function seedCompendiumContent(
  tx: SeedTransaction,
  input: LoadedCompendium,
  { manifest = null, force = false }: Pick<SeedCompendiumOptions, 'manifest' | 'force'> = {},
): Promise<SeedCompendiumReport> {
  const report = emptyReport();
  const items = seedItems(input);
  const present = await presentRows(tx);
  const missing: SeedItem[] = [];
  const met: { item: SeedItem; id: string }[] = [];
  for (const item of items) {
    const row = present(item.entry);
    if (row === undefined) missing.push(item);
    else met.push({ item, id: row.id });
  }

  const picks = await readPicks(tx);
  await insertEntries(tx, missing, picks);
  report.inserted = missing.length;
  if (met.length === 0) return report;

  const rows = await tx.select().from(ingredients).where(isNull(ingredients.workspaceId));
  const metIds = new Set(met.map(({ id }) => id));
  const { states, inUse } = await readStates(
    tx,
    rows.filter((row) => metIds.has(row.id)),
  );
  const ctx = {
    picks,
    targets: await substituteTargets(tx),
    referenceTexts: await readReferenceTexts(tx),
    inUse,
    manifest,
    force,
  };

  for (const { item, id } of met) {
    const state = requireFrom(states, id, () => `${item.where} was present and then not.`);
    const { adopt, outcome } = decide(item, state, ctx);
    if (adopt) {
      await adoptHash(tx, id, adopt.hash);
      report.adopted.push({ where: item.where, differs: adopt.differs });
    }
    switch (outcome.kind) {
      case 'skip':
        report.skipped += 1;
        break;
      case 'retired':
        report.retired.push(item.where);
        break;
      case 'pending':
        report.pending.push({ where: item.where, differs: outcome.differs });
        break;
      case 'refused':
        report.refused.push({
          where: item.where,
          reason: outcome.reason,
          differs: outcome.differs,
        });
        break;
      case 'update':
        await applyUpdate(tx, item, state, ctx, outcome.plan);
        report.updated.push(item.where);
        break;
    }
  }
  return report;
}

/** Inserts `missing` whole: the entries, then everything beneath them, each list in one statement. */
async function insertEntries(
  tx: SeedTransaction,
  missing: readonly SeedItem[],
  picks: Awaited<ReturnType<typeof readPicks>>,
): Promise<void> {
  if (missing.length === 0) return;

  const inserted = await insertStamped(
    tx,
    ingredients,
    missing.map(({ entry, hash }) => entryRow(entry, picks, hash)),
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

/**
 * The compendium tier's present rows, and how an entry finds its own: a row
 * holding its seed key, live or deleted, first; then a live row of its
 * identity; then a live row at its slug.
 */
async function presentRows(
  tx: SeedTransaction,
): Promise<(entry: SeedCompendiumEntry) => { id: string } | undefined> {
  const rows = await tx
    .select({
      id: ingredients.id,
      seedKey: ingredients.seedKey,
      identityKey: ingredients.identityKey,
      slug: ingredients.slug,
      deletedAt: ingredients.deletedAt,
    })
    .from(ingredients)
    .where(isNull(ingredients.workspaceId));

  const bySeedKey = new Map<string, { id: string }>();
  const liveByIdentity = new Map<string, { id: string }>();
  const liveBySlug = new Map<string, { id: string }>();
  for (const row of rows) {
    if (row.seedKey !== null && !bySeedKey.has(row.seedKey)) bySeedKey.set(row.seedKey, row);
    if (row.deletedAt === null) {
      liveByIdentity.set(row.identityKey, row);
      liveBySlug.set(row.slug, row);
    }
  }
  return (entry) => {
    const identity = identityOf(entry);
    return (
      bySeedKey.get(identity) ??
      liveByIdentity.get(identity) ??
      liveBySlug.get(ingredientSlug(entry.name, entry.canonicalName))
    );
  };
}
