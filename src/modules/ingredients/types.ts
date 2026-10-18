import type { z } from 'zod';
import type {
  CompendiumFacets,
  CupboardEntryRow,
  FacetCount,
  IngredientFacets,
  IngredientRow,
  ReferenceRow,
  StockRow,
  WorkspaceIngredientFacets,
} from '../../db/repository';
import type { ingredientDeities } from './schema/ingredient-deities';
import type { ingredientVariants } from './schema/ingredient-variants';
import type { CompendiumIngredientInput, LocalIngredientInput } from './validation/ingredient';
import type { ReferenceInput } from './validation/reference';
import type { StockInput } from './validation/stock';
import type { DeityEntry, ReferenceLinkEntry, SubstituteEntry } from './validation/types';
import type { ValidationIssue } from '../../lib/types';
import type { CategoryGroupRow, CategoryRow, DeityRow } from '@/modules/vocabulary';
import type { FormGroupIcon } from '@/modules/vocabulary/schema/form-group-icons';

// The repository's own, rather than a second `typeof …$inferSelect`.
export type {
  CompendiumFacets,
  CupboardEntryRow,
  FacetCount,
  IngredientFacets,
  IngredientRow,
  ReferenceRow,
  StockRow,
  WorkspaceIngredientFacets,
};

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

/**
 * A compendium entry as `Ingredient.cupboardEntry`'s loader keys it (M12.14):
 * the entry, and the coven whose cupboard is asked about, the argument the
 * caller named, as `StockKey`'s is.
 */
export interface CupboardEntryKey {
  ingredientId: string;
  workspaceId: string;
}

/**
 * A cupboard entry as `CupboardEntry` answers it on the wire (M12.14): the
 * row, with the compendium entry's own name beside the coven's label.
 */
export type CupboardEntryNode = CupboardEntryRow & { compendiumName: string };

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
/** One live folk name as `Ingredient.folkNames` reads it: the row's id, so it can be promoted, and its text. */
export interface FolkNameRow {
  id: string;
  name: string;
}

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

/**
 * A category as the entry page shows it (M8.19): the row, and the group whose
 * colours its chip takes, read with it so the page needs no second lookup.
 */
export interface CategoryDetail {
  category: CategoryRow;
  group: CategoryGroupRow;
}

/**
 * A deity as the entry page shows it: its name, and the tradition the curated
 * deity sits in, null for a typed name and once the deity or its tradition
 * is retired.
 */
export interface DeityDetail {
  name: string;
  tradition: string | null;
}

/**
 * A substitute as the entry page shows it: the name, the ingredient to link
 * (null on typed text and on a deleted link, when the name is plain text),
 * and the form the link names, null when it names the ingredient whole.
 */
export interface SubstituteDetail {
  name: string;
  ingredient: Pick<IngredientRow, 'id' | 'slug' | 'workspaceId'> | null;
  form: string | null;
}

/**
 * One form of an ingredient as its page shows it (MB.215): the variant's row,
 * the icon of the curated form's group (null on an uncurated form), and the
 * lists that are the form's own, its references included.
 */
export interface VariantDetail {
  variant: IngredientVariantRow;
  icon: FormGroupIcon | null;
  categories: CategoryDetail[];
  substitutes: SubstituteDetail[];
  /** The form's own sources, alphabetical by citation; never its ingredient's. */
  references: CitedReference[];
}

/**
 * An ingredient as its page shows it (M8.19): the row, the child lists that
 * are the ingredient's own, and one detail per live variant in form order.
 * Both routes render this one shape; the public one reads it from the cache.
 */
export interface IngredientDetail {
  entry: IngredientRow;
  /**
   * The cupboard entry of the coven the page is read in, for a compendium
   * entry that coven holds (M12.14); null on the public page, for a coven's
   * own entry, and for one the coven does not hold. `entry` is the
   * compendium's row as it is: `applyCupboardEntry` lays this over it.
   */
  cupboardEntry: CupboardEntryRow | null;
  /** Names only: the page displays them and promotes none. */
  folkNames: string[];
  categories: CategoryDetail[];
  deities: DeityDetail[];
  substitutes: SubstituteDetail[];
  /** The sources the ingredient cites, alphabetical by citation (the loader's sort). */
  references: CitedReference[];
  variants: VariantDetail[];
}

/** What the public entry route reads: the detail at an address, or the slug it moved to. */
export type CompendiumEntryPage =
  | {
      kind: 'entry';
      detail: IngredientDetail;
      /** The entry that moved off this address, while its redirect's window is open. */
      movedAway: Pick<IngredientRow, 'name' | 'slug'> | null;
    }
  | { kind: 'moved'; slug: string };

/** A compendium entry a coven's own entry hides (M12.12), as its page links it. */
export interface ReplacedCompendiumEntry {
  id: string;
  slug: string;
  name: string;
  canonicalName: string | null;
}

/** The first few compendium entries a coven's own entry hides, by name, and how many it hides in all (M12.12). */
export interface ReplacedCompendiumEntries {
  entries: ReplacedCompendiumEntry[];
  total: number;
}
