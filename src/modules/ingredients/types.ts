import type { z } from 'zod';
import type { IngredientRow, ReferenceRow, StockRow } from '../../db/repository';
import type { ingredientDeities } from './schema/ingredient-deities';
import type { ingredientVariants } from './schema/ingredient-variants';
import type { CompendiumIngredientInput, LocalIngredientInput } from './validation/ingredient';
import type { ReferenceInput } from './validation/reference';
import type { StockInput } from './validation/stock';
import type { DeityEntry, ReferenceLinkEntry, SubstituteEntry } from './validation/types';
import type { ValidationIssue } from '../../lib/types';
import type { CategoryRow, DeityRow } from '@/modules/vocabulary';

// The repository's own, rather than a second `typeof …$inferSelect`.
export type { IngredientRow, ReferenceRow, StockRow };

// The vocabulary's own, which a category's loader answers with.
export type { CategoryRow };

/**
 * An ingredient as its children's loaders key it: the row a resolver already
 * holds. `workspaceId` says which proof to ask for; it is never the scope —
 * the read takes that from the proofs, so a key claiming the wrong tier is
 * answered with nothing.
 */
export type IngredientKey = Pick<IngredientRow, 'id' | 'workspaceId'>;

/**
 * One live form of an ingredient as `Ingredient.variants` reads it (MB.218):
 * the variant's row, and the tier of the ingredient it was read under. A
 * variant has no `workspace_id` of its own, and its children's loaders need
 * one to know which proof to ask for, as an ingredient's do.
 */
export type IngredientVariantRow = typeof ingredientVariants.$inferSelect &
  Pick<IngredientRow, 'workspaceId'>;

/**
 * A variant as its children's loaders key it, the row a resolver already
 * holds. `workspaceId` is its ingredient's, and says which proof to ask
 * for; it is never the scope, which the read takes through the variant to its
 * ingredient, as `IngredientKey` says of an ingredient's.
 */
export type VariantKey = Pick<IngredientVariantRow, 'id' | 'ingredientId' | 'workspaceId'>;

/**
 * An ingredient's stock as `Ingredient.stock`'s loader keys it (M9.4): the
 * ingredient, and the coven whose jars of it are asked for. Unlike
 * `IngredientKey`'s, `workspaceId` is the argument the caller named, never
 * the row's own tier, and is always a coven: the compendium holds no stock.
 */
export interface StockKey {
  ingredientId: string;
  workspaceId: string;
}

/** One `ingredient_variants` row as the table holds it. */
export type VariantRecord = typeof ingredientVariants.$inferSelect;

/** The parsed input without its child rows; both tiers' variants parse to this shape. */
export type IngredientFields = Omit<
  LocalIngredientInput,
  'folkNames' | 'substitutes' | 'deities' | 'references' | 'variants'
>;

/** Where in the input an issue lands — `['variants', 1]` — as `ValidationIssue` paths it. */
export type IssuePath = ValidationIssue['path'];

/** One form of the ingredient as the schema parses it (MB.215). */
export type VariantEntry = NonNullable<LocalIngredientInput['variants']>[number];

/**
 * One form as a save writes it, once `resolvePicks` has checked its pick and
 * its categories: every `""` and `[]` the input sent as none, as the row
 * holds it, and `at`, where the input sent it, `['variants', i]`, which every
 * issue about it is pathed beneath. The one form the top-level `form` stands
 * for when no list is sent is at `[]`, so its issues land on `form` and
 * `formId` as they did before variants (until MB.222).
 */
export interface PickedVariant {
  id: string | null;
  form: string;
  formId: string | null;
  description: string | null;
  safetyNotes: string | null;
  toxic: boolean;
  elements: VariantRecord['elements'];
  celestialBodies: string[] | null;
  zodiacSigns: string[] | null;
  colors: string[] | null;
  categoryIds: string[];
  substitutes: SubstituteEntry[];
  references: ReferenceLinkEntry[];
  at: IssuePath;
}

/**
 * Whose child rows a write brings to a list (MB.219): the ingredient's own,
 * with no variant, or one of its forms', each still carrying the ingredient,
 * as the composite keys hold them (MB.217). `at` is where the input sent the
 * owner, which an issue about one of its rows is pathed beneath.
 */
export interface ChildOwner {
  ingredientId: string;
  variantId: string | null;
  at: IssuePath;
}

/** The lists `resolvePicks` checks against the database before they are written. */
export interface PickedLists {
  deities: readonly DeityEntry[];
  variants: readonly VariantEntry[] | null | undefined;
}

/** The tier a write is in, which decides what a pick must be (MB.167). */
export type Tier = 'compendium' | 'coven';

/** One `ingredient_deities` row as the table holds it. */
export type DeityRecord = typeof ingredientDeities.$inferSelect;

/**
 * One deity as a save writes it, once its pick is checked: the deity linked,
 * or none for a typed name, and the name the row holds — a curated pick's in
 * its row's spelling.
 */
export interface PickedDeity {
  deityId: string | null;
  name: string;
}

/**
 * What `writeChildren` writes beside an ingredient's row: the parsed input's
 * lists, each absent one written as empty, the deities as `resolvePicks`
 * resolved them, and the deity rows the ingredient held before, which a
 * replace keeps where it lists them again — none on an add.
 */
export interface IngredientChildren extends Pick<
  LocalIngredientInput,
  'folkNames' | 'substitutes' | 'references' | 'categoryIds'
> {
  deities: readonly PickedDeity[];
  heldDeities?: readonly DeityRecord[];
  /** Its forms, each with its own children (MB.219); none on a write that names none. */
  variants?: readonly PickedVariant[];
}

/**
 * One deity as `Ingredient.deities` reads it (MB.167): the name the row holds,
 * and the curated deity picked, null on a typed name and once that deity or
 * its tradition is retired, when the row reads as its name.
 */
export interface IngredientDeityRow {
  name: string;
  deity: DeityRow | null;
}

/**
 * One substitute as `Ingredient.substitutes` reads it (DESIGN.md §7): the name
 * it shows — the linked ingredient's label, its last once deleted, or the
 * typed text — the ingredient to follow, null on typed text and on a deleted
 * link, and the form of it the link names, null when it names none or the
 * ingredient is gone (MB.218). The form is an id, read beneath the linked
 * ingredient like any of its variants, never by itself.
 */
export interface SubstituteRow {
  name: string;
  ingredient: IngredientRow | null;
  variantId: string | null;
}

/**
 * One reference as `Ingredient.references` reads it (DESIGN.md §7,
 * `ReferenceLink`): the source, and the locator the link carries — "p. 112" —
 * or null.
 */
export interface CitedReference {
  reference: ReferenceRow;
  locator: string | null;
}

/** What the workspace service parses: the form's values, or the mutation's input. */
export type IngredientValues = z.input<typeof LocalIngredientInput>;

/** What the stock service parses: the row editor's values, or a mutation's input. */
export type StockValues = z.input<typeof StockInput>;

/** What the reference service parses: the form's values, or a mutation's input. */
export type ReferenceValues = z.input<typeof ReferenceInput>;

/**
 * What a compendium write takes: the admin form's values, or a mutation's
 * input, and the admin's confirmation that the write may end another entry's
 * redirect.
 */
export type CompendiumWrite = z.input<typeof CompendiumIngredientInput> & { endRedirect?: boolean };

/** What a compendium address answers: the entry there, or the slug it moved to. */
export type CompendiumAddress =
  | {
      kind: 'entry';
      entry: IngredientRow;
      /** The entry that moved off this address, while its redirect's window is open. */
      movedAway: IngredientRow | null;
    }
  | { kind: 'moved'; slug: string };
