import { and, eq, inArray, isNull, sql } from 'drizzle-orm';
import { applyAudit } from '../../audit';
import { BOOTSTRAP_USER_ID } from '../../bootstrap';
import { BOOTSTRAP_SESSION } from '../bootstrap-admin';
import { insertStamped } from '../idempotent';
import { insertMissingReferences } from '../reference-rows';
import { identityOf } from '../coven-content';
import {
  categoryRows,
  citing,
  deityRows,
  entryColumns,
  foldForm,
  folkNameRows,
  pick,
  pickedVariants,
  substituteRows,
  variantColumns,
  type Citing,
  type PickedVariant,
  type Picks,
  type SubstituteTarget,
} from './rows';
import { citationText } from '../../../lib/citation';
import { ingredients } from '../../../modules/ingredients/schema/ingredients';
import { ingredientVariants } from '../../../modules/ingredients/schema/ingredient-variants';
import { ingredientFolkNames } from '../../../modules/ingredients/schema/ingredient-folk-names';
import { ingredientDeities } from '../../../modules/ingredients/schema/ingredient-deities';
import { ingredientCategories } from '../../../modules/ingredients/schema/ingredient-categories';
import { ingredientSubstitutes } from '../../../modules/ingredients/schema/ingredient-substitutes';
import { inventoryItems } from '../../../modules/ingredients/schema/inventory-items';
import { referenceLinks } from '../../../modules/ingredients/schema/reference-links';
import { references } from '../../../modules/ingredients/schema/references';
import { spellSteps } from '../../../modules/grimoire/schema/spell-steps';
import type { CitationFields } from '../../../lib/types';
import type { SeedCompendiumEntry, SeedCompendiumVariant, SeedTransaction } from '../types';

// The seed's update path for an entry already present (state table: "Write-once,
// and how a correction lands"). Children are reconciled by key, never dropped and
// re-created, because stock rows and spell layers hold a variant id. (claude-docs/db/compendium-seed/README.md, "Reconciling an entry that is already present")

/** One approved entry file as the seed takes it. */
export interface SeedItem {
  entry: SeedCompendiumEntry;
  /** The works and per-entry sources its citations may name, by handle. */
  sources: Record<string, CitationFields>;
  /** The entry file's path under the compendium root, which names the entry in the report. */
  where: string;
  /** `contentHash(entry)`, computed when the file was read. */
  hash: string;
  /** The hash the curator marked for update, when the file carries one. */
  seedUpdate?: string;
  /** Only beside `seedUpdate`: the update may overwrite a curator's or an editor's work. */
  overwriteEditor?: true;
}

type IngredientRow = typeof ingredients.$inferSelect;
type VariantRow = typeof ingredientVariants.$inferSelect;
type FolkNameRow = typeof ingredientFolkNames.$inferSelect;
type DeityRow = typeof ingredientDeities.$inferSelect;
type CategoryRow = typeof ingredientCategories.$inferSelect;
type SubstituteRow = typeof ingredientSubstitutes.$inferSelect;
type LinkRow = typeof referenceLinks.$inferSelect;

/** A present row with every child row beneath it, live and soft-deleted alike: what the decision reads. */
export interface PresentState {
  row: IngredientRow;
  variants: VariantRow[];
  folkNames: FolkNameRow[];
  deities: DeityRow[];
  categories: CategoryRow[];
  substitutes: SubstituteRow[];
  links: LinkRow[];
}

/** What every decision in a run shares, read once after the run's inserts. */
export interface UpdateContext {
  picks: Picks;
  /** Every live compendium entry a substitute may link, the run's inserts included. */
  targets: Map<string, SubstituteTarget>;
  /** Each compendium-tier reference row's citation text by id, so a live link reads as the citation it came from. */
  referenceTexts: Map<string, string>;
  /** The variant ids a live stock row or spell layer holds. */
  inUse: Set<string>;
  /** The conversion manifest, identity to hash, or `null` when it is gone (load.ts). */
  manifest: Record<string, string> | null;
  /**
   * The run's `--force`: lifts refusals 1 to 4 for every marked
   * entry, as `overwriteEditor` lifts 1 to 3 for one file.
   */
  force: boolean;
}

/** Reads every child of `rows` in six statements, and the usage of their forms in two more. */
export async function readStates(
  tx: SeedTransaction,
  rows: readonly IngredientRow[],
): Promise<{ states: Map<string, PresentState>; inUse: Set<string> }> {
  const states = new Map<string, PresentState>(
    rows.map((row) => [
      row.id,
      { row, variants: [], folkNames: [], deities: [], categories: [], substitutes: [], links: [] },
    ]),
  );
  if (rows.length === 0) return { states, inUse: new Set() };
  const ids = rows.map((row) => row.id);
  const of = (id: string) => states.get(id) as PresentState;

  const variants = await tx
    .select()
    .from(ingredientVariants)
    .where(inArray(ingredientVariants.ingredientId, ids));
  for (const row of variants) of(row.ingredientId).variants.push(row);
  const variantIds = variants.map((row) => row.id);
  const variantOwner = new Map(variants.map((row) => [row.id, row.ingredientId]));

  for (const row of await tx
    .select()
    .from(ingredientFolkNames)
    .where(inArray(ingredientFolkNames.ingredientId, ids)))
    of(row.ingredientId).folkNames.push(row);
  for (const row of await tx
    .select()
    .from(ingredientDeities)
    .where(inArray(ingredientDeities.ingredientId, ids)))
    of(row.ingredientId).deities.push(row);
  for (const row of await tx
    .select()
    .from(ingredientCategories)
    .where(inArray(ingredientCategories.ingredientId, ids)))
    of(row.ingredientId).categories.push(row);
  for (const row of await tx
    .select()
    .from(ingredientSubstitutes)
    .where(inArray(ingredientSubstitutes.ingredientId, ids)))
    of(row.ingredientId).substitutes.push(row);
  const links = await tx
    .select()
    .from(referenceLinks)
    .where(inArray(referenceLinks.ingredientId, ids));
  if (variantIds.length > 0) {
    links.push(
      ...(await tx
        .select()
        .from(referenceLinks)
        .where(inArray(referenceLinks.ingredientVariantId, variantIds))),
    );
  }
  for (const row of links) {
    const owner = row.ingredientId ?? variantOwner.get(row.ingredientVariantId as string);
    if (owner !== undefined) of(owner).links.push(row);
  }

  const inUse = new Set<string>();
  if (variantIds.length > 0) {
    for (const { variantId } of await tx
      .select({ variantId: inventoryItems.variantId })
      .from(inventoryItems)
      .where(and(inArray(inventoryItems.variantId, variantIds), isNull(inventoryItems.deletedAt))))
      inUse.add(variantId);
    for (const { variantId } of await tx
      .select({ variantId: spellSteps.variantId })
      .from(spellSteps)
      .where(and(inArray(spellSteps.variantId, variantIds), isNull(spellSteps.deletedAt))))
      if (variantId !== null) inUse.add(variantId);
  }
  return { states, inUse };
}

/** Every compendium-tier reference row's citation text by id: the seed's key where it wrote the row, the citation rendered otherwise. */
export async function readReferenceTexts(tx: SeedTransaction): Promise<Map<string, string>> {
  const rows = await tx.select().from(references).where(isNull(references.workspaceId));
  return new Map(rows.map((row) => [row.id, row.seedKey ?? citationText(row)]));
}

/** A row a person wrote, changed or deleted: anyone but the bootstrap user on any stamp. The seed's own soft delete is not a person's. */
function touched(row: {
  createdBy: string;
  updatedBy: string;
  deletedAt?: Date | null;
  deletedBy?: string | null;
}): boolean {
  return (
    row.createdBy !== BOOTSTRAP_USER_ID ||
    row.updatedBy !== BOOTSTRAP_USER_ID ||
    ((row.deletedAt ?? null) !== null && row.deletedBy !== BOOTSTRAP_USER_ID)
  );
}

/** The child table a person touched, in the order the README lists them, or `null`. */
function touchedChild(state: PresentState): string | null {
  const tables: [string, { createdBy: string; updatedBy: string }[]][] = [
    ['ingredient_variants', state.variants],
    ['ingredient_folk_names', state.folkNames],
    ['ingredient_deities', state.deities],
    ['ingredient_categories', state.categories],
    ['ingredient_substitutes', state.substitutes],
    ['reference_links', state.links],
  ];
  return tables.find(([, rows]) => rows.some(touched))?.[0] ?? null;
}

/** The row and every child bootstrap-stamped and live: what adoption requires. */
function wholeAndUntouched(state: PresentState): boolean {
  const children = [
    ...state.variants,
    ...state.folkNames,
    ...state.deities,
    ...state.substitutes,
    ...state.links,
  ];
  return (
    !touched(state.row) &&
    children.every((row) => row.deletedAt === null) &&
    touchedChild(state) === null
  );
}

const same = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

/** The scalar columns on which the file and the row disagree. */
function scalarDiffs(entry: SeedCompendiumEntry, row: IngredientRow, picks: Picks): string[] {
  const wanted = entryColumns(entry, picks);
  return (Object.keys(wanted) as (keyof typeof wanted)[]).filter(
    (key) => !same(wanted[key], row[key]),
  );
}

/** The live form row a file form stands for: by the curated form, then by its folded name, then by the file's folded form. */
function matchVariant(
  live: readonly VariantRow[],
  variant: SeedCompendiumVariant,
  picks: Picks,
): VariantRow | undefined {
  const form = pick(picks, 'forms', variant.form);
  return (
    (form && live.find((row) => row.formId === form.id)) ??
    (form && live.find((row) => foldForm(row.form) === foldForm(form.name))) ??
    live.find((row) => foldForm(row.form) === foldForm(variant.form))
  );
}

interface VariantPlan {
  /** A file form matched to its live row, picked or not: these rows stay. */
  matched: Map<SeedCompendiumVariant, VariantRow>;
  /** A matched, picked form whose columns differ. */
  update: { row: VariantRow; columns: ReturnType<typeof variantColumns> }[];
  /** A picked form with no live row. */
  insert: PickedVariant[];
  /** A live row no file form stands for. */
  remove: VariantRow[];
}

function planVariants(entry: SeedCompendiumEntry, state: PresentState, picks: Picks): VariantPlan {
  const live = state.variants.filter((row) => row.deletedAt === null);
  // Every file form, picked or retired, claims its row: a retired curated form
  // never reads as a removed one.
  const matched = new Map<SeedCompendiumVariant, VariantRow>();
  for (const variant of entry.variants) {
    const row = matchVariant(live, variant, picks);
    if (row && ![...matched.values()].includes(row)) matched.set(variant, row);
  }
  const picked = pickedVariants(entry, picks);
  const update = picked.flatMap((candidate) => {
    const row = matched.get(candidate.variant);
    if (!row) return [];
    const columns = variantColumns(candidate, picks);
    const differs = (Object.keys(columns) as (keyof typeof columns)[]).some(
      (key) => !same(columns[key], row[key]),
    );
    return differs ? [{ row, columns }] : [];
  });
  const kept = new Set([...matched.values()].map((row) => row.id));
  return {
    matched,
    update,
    insert: picked.filter((candidate) => !matched.has(candidate.variant)),
    remove: live.filter((row) => !kept.has(row.id)),
  };
}

/** A key over the columns a child's unique index folds, so the file's rows and the live rows meet. */
const keyed = (...parts: (string | null | undefined)[]) => parts.map((p) => p ?? '').join('|');

interface ChildDiffs {
  folkNames: { insert: { ingredientId: string; name: string }[]; remove: string[] };
  deities: { rename: { id: string; name: string }[]; replace: boolean };
  categories: {
    insert: ReturnType<typeof categoryRows>;
    remove: { ingredientId: string; variantId: string | null; categoryId: string }[];
  };
  substitutes: { insert: ReturnType<typeof substituteRows>; remove: string[] };
  references: { insert: Citing[]; remove: string[] };
  differs: string[];
}

/**
 * What the children of the entry and of the forms in `variantIdOf` must
 * become. A form not in the map, a removed one, keeps its children: they go
 * dark with their row. A form just inserted has none yet.
 */
function childDiffs(
  item: SeedItem,
  state: PresentState,
  ctx: UpdateContext,
  variantIdOf: Map<SeedCompendiumVariant, string>,
): ChildDiffs {
  const { entry, sources } = item;
  const { picks, targets } = ctx;
  const ingredientId = state.row.id;
  const owners = new Set<string | null>([null, ...variantIdOf.values()]);
  const differs: string[] = [];

  const liveFolk = state.folkNames.filter((row) => row.deletedAt === null);
  const wantedFolk = folkNameRows(entry, ingredientId);
  const haveFolk = new Set(liveFolk.map((row) => row.name.toLowerCase()));
  const wantFolk = new Set(wantedFolk.map((row) => row.name.toLowerCase()));
  const folkNames = {
    insert: wantedFolk.filter((row) => !haveFolk.has(row.name.toLowerCase())),
    remove: liveFolk.filter((row) => !wantFolk.has(row.name.toLowerCase())).map((row) => row.id),
  };
  if (folkNames.insert.length > 0 || folkNames.remove.length > 0) differs.push('folkNames');

  const liveDeities = state.deities
    .filter((row) => row.deletedAt === null)
    .sort((a, b) => a.position - b.position);
  const wantedDeities = deityRows(entry, ingredientId, picks);
  const sameOrder =
    liveDeities.length === wantedDeities.length &&
    liveDeities.every((row, index) => row.deityId === wantedDeities[index].deityId);
  const deities = {
    rename: sameOrder
      ? liveDeities.flatMap((row, index) =>
          row.name === wantedDeities[index].name
            ? []
            : [{ id: row.id, name: wantedDeities[index].name }],
        )
      : [],
    replace: !sameOrder,
  };
  if (deities.replace || deities.rename.length > 0) differs.push('deities');

  const wantedCategories = [
    ...categoryRows(entry.categories, ingredientId, null, picks),
    ...entry.variants.flatMap((variant) => {
      const variantId = variantIdOf.get(variant);
      return variantId === undefined
        ? []
        : categoryRows(variant.categories, ingredientId, variantId, picks);
    }),
  ];
  const liveCategories = state.categories.filter((row) => owners.has(row.variantId));
  const categoryKey = (row: { variantId?: string | null; categoryId: string }) =>
    keyed(row.variantId, row.categoryId);
  const haveCategories = new Set(liveCategories.map(categoryKey));
  const wantCategories = new Set(wantedCategories.map(categoryKey));
  const categories = {
    insert: wantedCategories.filter((row) => !haveCategories.has(categoryKey(row))),
    remove: liveCategories
      .filter((row) => !wantCategories.has(categoryKey(row)))
      .map(({ ingredientId, variantId, categoryId }) => ({ ingredientId, variantId, categoryId })),
  };
  if (categories.insert.length > 0 || categories.remove.length > 0) differs.push('categories');

  const wantedSubstitutes = [
    ...substituteRows(entry.substitutes, ingredientId, null, targets),
    ...entry.variants.flatMap((variant) => {
      const variantId = variantIdOf.get(variant);
      return variantId === undefined
        ? []
        : substituteRows(variant.substitutes, ingredientId, variantId, targets);
    }),
  ];
  const liveSubstitutes = state.substitutes.filter(
    (row) => row.deletedAt === null && owners.has(row.variantId),
  );
  const substituteKey = (row: {
    variantId?: string | null;
    substituteId?: string | null;
    substituteVariantId?: string | null;
    name?: string | null;
  }) => keyed(row.variantId, row.substituteId, row.substituteVariantId, row.name?.toLowerCase());
  const haveSubstitutes = new Set(liveSubstitutes.map(substituteKey));
  const wantSubstitutes = new Set(wantedSubstitutes.map(substituteKey));
  const substitutes = {
    insert: wantedSubstitutes.filter((row) => !haveSubstitutes.has(substituteKey(row))),
    remove: liveSubstitutes
      .filter((row) => !wantSubstitutes.has(substituteKey(row)))
      .map((row) => row.id),
  };
  if (substitutes.insert.length > 0 || substitutes.remove.length > 0) differs.push('substitutes');

  const wantedLinks = [
    ...citing(entry.references, sources, { ingredientId }),
    ...entry.variants.flatMap((variant) => {
      const variantId = variantIdOf.get(variant);
      return variantId === undefined
        ? []
        : citing(variant.references, sources, { ingredientVariantId: variantId });
    }),
  ];
  const ownerKey = (owner: {
    ingredientId?: string | null;
    ingredientVariantId?: string | null;
  }) => (owner.ingredientVariantId ? `variant:${owner.ingredientVariantId}` : 'entry');
  const liveLinks = state.links.filter(
    (row) =>
      row.deletedAt === null &&
      (row.ingredientVariantId === null || owners.has(row.ingredientVariantId)),
  );
  const haveLinks = new Set(
    liveLinks.map((row) =>
      keyed(ownerKey(row), ctx.referenceTexts.get(row.referenceId) ?? row.referenceId, row.locator),
    ),
  );
  const wantLinks = new Set(
    wantedLinks.map((cite) => keyed(ownerKey(cite.owner), cite.text, cite.citation.locator)),
  );
  const links = {
    insert: wantedLinks.filter(
      (cite) => !haveLinks.has(keyed(ownerKey(cite.owner), cite.text, cite.citation.locator)),
    ),
    remove: liveLinks
      .filter(
        (row) =>
          !wantLinks.has(
            keyed(
              ownerKey(row),
              ctx.referenceTexts.get(row.referenceId) ?? row.referenceId,
              row.locator,
            ),
          ),
      )
      .map((row) => row.id),
  };
  if (links.insert.length > 0 || links.remove.length > 0) differs.push('references');

  return { folkNames, deities, categories, substitutes, references: links, differs };
}

/** The whole difference between a file and its present row, and whether the update may land. */
export interface UpdatePlan {
  scalars: string[];
  variants: VariantPlan;
  /** The top-level fields that differ, scalars first, then the child lists, as the report prints them. */
  differs: string[];
  /** The update would change `name`, `canonicalName` or the slug: the admin's to change. */
  identityChange: boolean;
  /** A removed form that stock or a spell layer holds. */
  formInUse: boolean;
}

export function planUpdate(item: SeedItem, state: PresentState, ctx: UpdateContext): UpdatePlan {
  const { entry } = item;
  const { picks } = ctx;
  const scalars = scalarDiffs(entry, state.row, picks);
  const variants = planVariants(entry, state, picks);
  const variantIdOf = new Map(
    [...variants.matched].map(([variant, row]) => [variant, row.id] as const),
  );
  const children = childDiffs(item, state, ctx, variantIdOf);
  const variantsDiffer =
    variants.update.length > 0 || variants.insert.length > 0 || variants.remove.length > 0;
  return {
    scalars,
    variants,
    differs: [...scalars, ...(variantsDiffer ? ['variants'] : []), ...children.differs],
    identityChange: scalars.some(
      (key) => key === 'name' || key === 'canonicalName' || key === 'slug',
    ),
    formInUse: variants.remove.some((row) => ctx.inUse.has(row.id)),
  };
}

/** What the run does with one present entry, the state table's rows. */
export type Outcome =
  | { kind: 'skip' }
  | { kind: 'retired' }
  | { kind: 'pending'; differs: string[] }
  | { kind: 'refused'; reason: string; differs: string[] }
  | { kind: 'update'; plan: UpdatePlan };

export interface Decision {
  /** The manifest hash the row adopts as its baseline first, with what differs from the file, when it has none and may. */
  adopt?: { hash: string; differs: string[] };
  outcome: Outcome;
}

export const REASONS = {
  reviewed: 'curator-reviewed',
  edited: 'edited on the site',
  noBaseline: 'no baseline',
  identity: 'identity change: use the admin',
  formInUse: 'form in use',
} as const;

/** Whether the site's work on `item`'s row gives way: its file's `overwriteEditor`, or the run's `--force`. */
const overwrites = (item: SeedItem, ctx: UpdateContext): boolean =>
  item.overwriteEditor === true || ctx.force;

/** The state table, one entry at a time. Reads only; `applyUpdate` writes. */
export function decide(item: SeedItem, state: PresentState, ctx: UpdateContext): Decision {
  const { row } = state;
  if (row.deletedAt !== null) return { outcome: { kind: 'retired' } };

  const plan = planUpdate(item, state, ctx);
  let stored = row.seedContentHash;
  let adopt: Decision['adopt'];
  if (stored === null) {
    const manifest = ctx.manifest?.[identityOf(item.entry)];
    if (manifest !== undefined && wholeAndUntouched(state)) {
      adopt = { hash: manifest, differs: plan.differs };
      stored = manifest;
    } else if (!ctx.force) {
      return { outcome: { kind: 'refused', reason: REASONS.noBaseline, differs: plan.differs } };
    }
    // Forced with no baseline: `stored` stays null, so the entry goes on to
    // the mark check below as an edit, never a skip.
  }
  // A matching hash: a row matching its file is skipped; one differing because a person worked on it is skipped quietly, as the file has not changed since.
  // Only the run's --force goes past that skip; the file's overwriteEditor does not. One differing with nobody's work on it is drift and goes on as a changed file does.
  if (stored === item.hash) {
    if (plan.differs.length === 0) return { adopt, outcome: { kind: 'skip' } };
    const worked = row.curatorReviewedAt !== null || touched(row) || touchedChild(state) !== null;
    if (worked && !ctx.force) return { adopt, outcome: { kind: 'skip' } };
  }
  if (item.seedUpdate !== item.hash) {
    return { adopt, outcome: { kind: 'pending', differs: plan.differs } };
  }

  const refused = (reason: string): Decision => ({
    adopt,
    outcome: { kind: 'refused', reason, differs: plan.differs },
  });
  if (plan.identityChange) return refused(REASONS.identity);
  if (!overwrites(item, ctx)) {
    if (row.curatorReviewedAt !== null) return refused(REASONS.reviewed);
    if (touched(row)) return refused(REASONS.edited);
    const child = touchedChild(state);
    if (child !== null) return refused(`child ${REASONS.edited}: ${child}`);
  }
  if (plan.formInUse) return refused(REASONS.formInUse);
  return { adopt, outcome: { kind: 'update', plan } };
}

/** Stores `hash` as the row's baseline and nothing else: the trigger ignores the column, so the stamps stay. */
export async function adoptHash(tx: SeedTransaction, id: string, hash: string): Promise<void> {
  await tx.update(ingredients).set({ seedContentHash: hash }).where(eq(ingredients.id, id));
}

/** The seed's one soft delete: the delete stamps, by the bootstrap user. */
const tombstone = () => applyAudit('delete', {}, BOOTSTRAP_SESSION);

/**
 * Applies a planned update inside the seed's transaction as the bootstrap user: the scalars and hash, then each child list reconciled in place.
 * `overwriteEditor` or `--force` clears the curator mark in the same statement, as the content is no longer what was reviewed.
 */
export async function applyUpdate(
  tx: SeedTransaction,
  item: SeedItem,
  state: PresentState,
  ctx: UpdateContext,
  plan: UpdatePlan,
): Promise<void> {
  const { entry } = item;
  const { picks } = ctx;
  const ingredientId = state.row.id;

  // Declared a touch, so the stamps land when only a child list changed: the
  // trigger would otherwise keep the old `updated_by` where no content column
  // of the row itself moved (migration 0081). Off again before the children.
  await tx.execute(sql`select set_config('app.touch_row', 'on', true)`);
  await tx
    .update(ingredients)
    .set(
      applyAudit(
        'update',
        {
          ...entryColumns(entry, picks),
          seedContentHash: item.hash,
          ...(overwrites(item, ctx) ? { curatorReviewedAt: null, curatorReviewedBy: null } : {}),
        },
        BOOTSTRAP_SESSION,
      ),
    )
    .where(eq(ingredients.id, ingredientId));
  await tx.execute(sql`select set_config('app.touch_row', '', true)`);

  for (const { row, columns } of plan.variants.update) {
    await tx
      .update(ingredientVariants)
      .set(applyAudit('update', columns, BOOTSTRAP_SESSION))
      .where(eq(ingredientVariants.id, row.id));
  }
  if (plan.variants.remove.length > 0) {
    await tx
      .update(ingredientVariants)
      .set(tombstone())
      .where(
        inArray(
          ingredientVariants.id,
          plan.variants.remove.map((row) => row.id),
        ),
      );
  }
  const variantIdOf = new Map(
    [...plan.variants.matched].map(([variant, row]) => [variant, row.id] as const),
  );
  if (plan.variants.insert.length > 0) {
    const inserted = await insertStamped(
      tx,
      ingredientVariants,
      plan.variants.insert.map((candidate) => ({
        ingredientId,
        ...variantColumns(candidate, picks),
      })),
    );
    const byForm = new Map(inserted.map((row) => [foldForm(row.form), row.id]));
    for (const candidate of plan.variants.insert) {
      const id = byForm.get(foldForm(candidate.form.name));
      if (id !== undefined) variantIdOf.set(candidate.variant, id);
    }
  }

  const children = childDiffs(item, state, ctx, variantIdOf);

  if (children.folkNames.remove.length > 0) {
    await tx
      .update(ingredientFolkNames)
      .set(tombstone())
      .where(inArray(ingredientFolkNames.id, children.folkNames.remove));
  }
  await insertStamped(tx, ingredientFolkNames, children.folkNames.insert);

  if (children.deities.replace) {
    const live = state.deities.filter((row) => row.deletedAt === null).map((row) => row.id);
    if (live.length > 0) {
      await tx
        .update(ingredientDeities)
        .set(tombstone())
        .where(inArray(ingredientDeities.id, live));
    }
    await insertStamped(tx, ingredientDeities, deityRows(entry, ingredientId, picks));
  } else {
    for (const { id, name } of children.deities.rename) {
      await tx
        .update(ingredientDeities)
        .set(applyAudit('update', { name }, BOOTSTRAP_SESSION))
        .where(eq(ingredientDeities.id, id));
    }
  }

  for (const { variantId, categoryId } of children.categories.remove) {
    await tx
      .delete(ingredientCategories)
      .where(
        and(
          eq(ingredientCategories.ingredientId, ingredientId),
          variantId === null
            ? isNull(ingredientCategories.variantId)
            : eq(ingredientCategories.variantId, variantId),
          eq(ingredientCategories.categoryId, categoryId),
        ),
      );
  }
  await insertStamped(tx, ingredientCategories, children.categories.insert);

  if (children.substitutes.remove.length > 0) {
    await tx
      .update(ingredientSubstitutes)
      .set(tombstone())
      .where(inArray(ingredientSubstitutes.id, children.substitutes.remove));
  }
  await insertStamped(tx, ingredientSubstitutes, children.substitutes.insert);

  if (children.references.remove.length > 0) {
    await tx
      .update(referenceLinks)
      .set(tombstone())
      .where(inArray(referenceLinks.id, children.references.remove));
  }
  // A source the run has not met is written here, never deleted: a reference
  // row is a work, and a link that goes is only the link.
  const referenceIds = await insertMissingReferences(
    tx,
    children.references.insert.map(({ fields }) => fields),
  );
  await insertStamped(
    tx,
    referenceLinks,
    children.references.insert.flatMap(({ citation, text, owner }) => {
      const referenceId = referenceIds.get(text);
      return referenceId ? [{ referenceId, ...owner, locator: citation.locator ?? null }] : [];
    }),
  );
}
