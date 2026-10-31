import { and, isNotNull, isNull } from 'drizzle-orm';
import { requireFrom } from '../idempotent';
import { identityOf } from '../coven-content';
import { deitiesNamed } from '../deities';
import { citationText } from '../../../lib/citation';
import { ingredientSlug, slugify } from '../../../lib/slugify';
import { ingredients } from '../../../modules/ingredients/schema/ingredients';
import { ingredientVariants } from '../../../modules/ingredients/schema/ingredient-variants';
import { ingredientSubstitutes } from '../../../modules/ingredients/schema/ingredient-substitutes';
import { categories } from '../../../modules/vocabulary/schema/categories';
import { deities } from '../../../modules/vocabulary/schema/deities';
import { ingredientForms } from '../../../modules/vocabulary/schema/ingredient-forms';
import { celestialBodies, zodiacSigns } from '../../../modules/vocabulary/schema/astrology';
import type { CitationFields } from '../../../lib/types';
import type { ingredientCategories } from '../../../modules/ingredients/schema/ingredient-categories';
import type { ingredientDeities } from '../../../modules/ingredients/schema/ingredient-deities';
import type { ingredientFolkNames } from '../../../modules/ingredients/schema/ingredient-folk-names';
import type {
  SeedCitation,
  SeedCompendiumEntry,
  SeedCompendiumVariant,
  SeedSubstitute,
  SeedTransaction,
} from '../types';

// The rows a compendium entry becomes: pure builders over an entry and its curated picks, shared by the insert and the update so they cannot drift.
// Not `writeChildren`, a service writer needing a `withAudit` session, which the seed lacks.

/** A curated row a literal names, by the key its seed gave it: its id and current spelling, or `null` once retired. */
export type CuratedPick = { id: string; name: string } | null;

/** The five curated vocabularies an entry picks from, each by seed key. */
export interface Picks {
  forms: Map<string, CuratedPick>;
  categories: Map<string, CuratedPick>;
  deities: Map<string, CuratedPick>;
  celestialBodies: Map<string, CuratedPick>;
  zodiacSigns: Map<string, CuratedPick>;
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

/** Every curated vocabulary the compendium picks from, read once per run. */
export async function readPicks(tx: SeedTransaction): Promise<Picks> {
  return {
    forms: await picksBySeedKey(tx, ingredientForms),
    categories: await picksBySeedKey(tx, categories),
    deities: await picksBySeedKey(tx, deities),
    celestialBodies: await picksBySeedKey(tx, celestialBodies),
    zodiacSigns: await picksBySeedKey(tx, zodiacSigns),
  };
}

/** The curated row `name` picks, or `null` once retired; a name no seed wrote throws, as every seed lookup does. */
export function pick(picks: Picks, kind: keyof Picks, name: string): CuratedPick {
  return requireFrom(
    picks[kind],
    slugify(name),
    () => `A compendium entry names ${kind} "${name}", which no seed wrote.`,
  );
}

/**
 * A celestial body or sign is stored as its row's current spelling;
 * a retired one is left off, and an empty list is stored as null.
 */
export function spelled(
  picks: Picks,
  kind: 'celestialBodies' | 'zodiacSigns',
  values: readonly string[] | null | undefined,
): string[] | null {
  const names = (values ?? []).flatMap((value) => pick(picks, kind, value)?.name ?? []);
  return names.length > 0 ? names : null;
}

/** An `ingredients` row's content columns: what an update may change, before the tier, key and stamps. */
export type EntryColumns = Pick<
  typeof ingredients.$inferInsert,
  | 'name'
  | 'canonicalName'
  | 'nomenclature'
  | 'slug'
  | 'description'
  | 'elements'
  | 'celestialBodies'
  | 'zodiacSigns'
  | 'colors'
  | 'safetyNotes'
  | 'toxic'
>;

/** The columns `entry` fills, under the curated spellings. */
export function entryColumns(entry: SeedCompendiumEntry, picks: Picks): EntryColumns {
  return {
    name: entry.name,
    canonicalName: entry.canonicalName ?? null,
    nomenclature: entry.nomenclature,
    slug: ingredientSlug(entry.name, entry.canonicalName),
    description: entry.description ?? null,
    elements: entry.elements ?? null,
    celestialBodies: spelled(picks, 'celestialBodies', entry.celestialBodies),
    zodiacSigns: spelled(picks, 'zodiacSigns', entry.zodiacSigns),
    colors: entry.colors ?? null,
    safetyNotes: entry.safetyNotes ?? null,
    toxic: entry.toxic ?? false,
  };
}

/**
 * The whole `ingredients` row an insert writes: the compendium tier, keyed by identity, before its stamps.
 * An entry with no category lands hidden; `shown` is written here and nowhere in the update, so a later run never changes it.
 */
export function entryRow(entry: SeedCompendiumEntry, picks: Picks, seedContentHash: string | null) {
  return {
    workspaceId: null,
    ...entryColumns(entry, picks),
    seedKey: identityOf(entry),
    seedContentHash,
    shown: (entry.categories?.length ?? 0) > 0,
  };
}

/** A form the entry names whose curated pick is live, with that pick. */
export interface PickedVariant {
  variant: SeedCompendiumVariant;
  form: NonNullable<CuratedPick>;
}

/** Each form whose curated pick is live; a retired pick drops the form with all it carries. */
export function pickedVariants(entry: SeedCompendiumEntry, picks: Picks): PickedVariant[] {
  return entry.variants.flatMap((variant) => {
    const form = pick(picks, 'forms', variant.form);
    return form === null ? [] : [{ variant, form }];
  });
}

/** An `ingredient_variants` row's content columns, under the pick's current spelling. */
export type VariantColumns = Pick<
  typeof ingredientVariants.$inferInsert,
  | 'form'
  | 'formId'
  | 'description'
  | 'safetyNotes'
  | 'toxic'
  | 'elements'
  | 'celestialBodies'
  | 'zodiacSigns'
  | 'colors'
>;

export function variantColumns({ variant, form }: PickedVariant, picks: Picks): VariantColumns {
  return {
    form: form.name,
    formId: form.id,
    description: variant.description ?? null,
    safetyNotes: variant.safetyNotes ?? null,
    toxic: variant.toxic ?? false,
    elements: variant.elements ?? null,
    celestialBodies: spelled(picks, 'celestialBodies', variant.celestialBodies),
    zodiacSigns: spelled(picks, 'zodiacSigns', variant.zodiacSigns),
    colors: variant.colors ?? null,
  };
}

/** The fold the variant's unique index keys a form by. */
export const foldForm = (form: string): string => form.trim().toLowerCase();

export type FolkNameRow = Pick<typeof ingredientFolkNames.$inferInsert, 'ingredientId' | 'name'>;

export function folkNameRows(entry: SeedCompendiumEntry, ingredientId: string): FolkNameRow[] {
  return (entry.folkNames ?? []).map((name) => ({ ingredientId, name }));
}

export type DeityRow = Pick<
  typeof ingredientDeities.$inferInsert,
  'ingredientId' | 'deityId' | 'name' | 'position'
>;

/**
 * The entry's deities in its order, each linked to the curated row under its current name; a retired pick is left off. A name may be a deity's other
 * name, linked to that one deity; the guard refuses a name meaning none or several before this runs.
 */
export function deityRows(
  entry: SeedCompendiumEntry,
  ingredientId: string,
  picks: Picks,
): DeityRow[] {
  return (entry.deities ?? [])
    .flatMap((name) => {
      const meant = deitiesNamed(name);
      return pick(picks, 'deities', meant.length === 1 ? meant[0] : name) ?? [];
    })
    .map((deity, position) => ({ ingredientId, deityId: deity.id, name: deity.name, position }));
}

export type CategoryRow = Pick<
  typeof ingredientCategories.$inferInsert,
  'ingredientId' | 'variantId' | 'categoryId'
>;

/** The category links of one owner: the entry (`variantId` null) or one of its forms. */
export function categoryRows(
  names: readonly string[] | undefined,
  ingredientId: string,
  variantId: string | null,
  picks: Picks,
): CategoryRow[] {
  return (names ?? []).flatMap((name) => {
    const category = pick(picks, 'categories', name);
    return category === null ? [] : [{ ingredientId, variantId, categoryId: category.id }];
  });
}

/** A substitute's possible targets: each live compendium entry by seed key and by identity, with its live forms. */
export interface SubstituteTarget {
  id: string;
  variants: Map<string, string>;
}

export async function substituteTargets(
  tx: SeedTransaction,
): Promise<Map<string, SubstituteTarget>> {
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
export type SubstituteRow = Pick<
  typeof ingredientSubstitutes.$inferInsert,
  'ingredientId' | 'variantId' | 'substituteId' | 'substituteVariantId' | 'name'
>;

/**
 * The rows a list of substitutes writes: a typed name as it is; a link to
 * the entry its identity names, and to the form when that form is live. A
 * link whose entry is gone is left off, as a retired pick is.
 */
export function substituteRows(
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

/** The row a citation links: the entry, or one of its forms. */
export type LinkOwner = { ingredientId: string } | { ingredientVariantId: string };

/** A citation with the work it names, resolved, and the row it links. */
export interface Citing {
  citation: SeedCitation<string>;
  fields: CitationFields;
  text: string;
  owner: LinkOwner;
}

/** Each citation of `owner`, its handle resolved against `sources`; a handle no work declares throws. */
export function citing(
  citations: readonly SeedCitation<string>[],
  sources: Record<string, CitationFields>,
  owner: LinkOwner,
): Citing[] {
  const registered = new Map(Object.entries(sources));
  return citations.map((citation) => {
    const fields = requireFrom(
      registered,
      citation.source,
      () => `A compendium entry cites "${citation.source}", which no work declares.`,
    );
    return { citation, fields, text: citationText(fields), owner };
  });
}
