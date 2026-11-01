import type { z } from 'zod';
import type {
  CompendiumFacets,
  CompendiumSlugEntry,
  CupboardEntryRow,
  FacetCount,
  IngredientFacets,
  IngredientRow,
  ReferenceRow,
  ReviewFacetValue,
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
  CompendiumSlugEntry,
  CupboardEntryRow,
  FacetCount,
  IngredientFacets,
  IngredientRow,
  ReferenceRow,
  ReviewFacetValue,
  StockRow,
  WorkspaceIngredientFacets,
};

// The vocabulary's own, which a category's loader answers with.
export type { CategoryRow };

/** An ingredient as its children's loaders key it; `workspaceId` picks the proof to ask for and is never the scope, so a key claiming the wrong tier gets nothing. */
export type IngredientKey = Pick<IngredientRow, 'id' | 'workspaceId'>;

/** One live form of an ingredient as `Ingredient.variants` reads it: the row and the tier it was read under, which its children's loaders need to pick a proof. */
export type IngredientVariantRow = typeof ingredientVariants.$inferSelect &
  Pick<IngredientRow, 'workspaceId'>;

/** A variant as its children's loaders key it; `workspaceId` is its ingredient's, and never the scope. */
export type VariantKey = Pick<IngredientVariantRow, 'id' | 'ingredientId' | 'workspaceId'>;

/** An ingredient's stock as `Ingredient.stock`'s loader keys it; `workspaceId` is the coven the caller named, always a coven. */
export interface StockKey {
  ingredientId: string;
  workspaceId: string;
}

/** A compendium entry as `Ingredient.cupboardEntry`'s loader keys it: the entry and the coven named by the caller. */
export interface CupboardEntryKey {
  ingredientId: string;
  workspaceId: string;
}

/** A cupboard entry as `CupboardEntry` answers it on the wire: the row, with the compendium entry's own name beside the coven's label. */
export type CupboardEntryNode = CupboardEntryRow & { compendiumName: string };

/**
 * What Make It Ours could not carry onto the new own entry, by name, each list sorted and without repeats;
 * only a folk name the new name took, so the other lists stay empty.
 */
export interface DroppedOnConvert {
  forms: string[];
  folkNames: string[];
  substitutes: string[];
  categories: string[];
  /** Each as its bibliography entry reads. */
  references: string[];
  deities: string[];
}

/** What `convertCompendiumEntryToLocal` answers: the own entry it wrote, and what that could not carry. */
export interface ConvertedCompendium {
  entry: IngredientRow;
  dropped: DroppedOnConvert;
}

/** One `ingredient_variants` row as the table holds it. */
export type VariantRecord = typeof ingredientVariants.$inferSelect;

/** The parsed input without its child rows; both tiers' variants parse to this shape. */
export type IngredientFields = Omit<
  LocalIngredientInput,
  'folkNames' | 'substitutes' | 'deities' | 'references' | 'variants'
>;

/** Where in the input an issue lands, such as `['variants', 1]`, as `ValidationIssue` paths it. */
export type IssuePath = ValidationIssue['path'];

/** One form of the ingredient as the schema parses it. */
export type VariantEntry = NonNullable<LocalIngredientInput['variants']>[number];

/**
 * One form as a save writes it, once `resolvePicks` has checked its pick and categories: `""` and `[]` read as none,
 * and `at` is where the input sent it. The single top-level `form` stands at `[]`.
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

/** Whose child rows a write brings to a list: the ingredient's own (no variant) or one form's; `at` is where the input sent the owner. */
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

/** The tier a write is in, which decides what a pick must be. */
export type Tier = 'compendium' | 'coven';

/** One `ingredient_deities` row as the table holds it. */
export type DeityRecord = typeof ingredientDeities.$inferSelect;

/** One deity as a save writes it: the deity linked (none for a typed name) and the name the row holds. */
export interface PickedDeity {
  deityId: string | null;
  name: string;
}

/** What `writeChildren` writes beside an ingredient's row: the input's lists (absent ones empty), the resolved deities, and the deity rows held before (none on an add). */
export interface IngredientChildren extends Pick<
  LocalIngredientInput,
  'folkNames' | 'substitutes' | 'references' | 'categoryIds'
> {
  deities: readonly PickedDeity[];
  heldDeities?: readonly DeityRecord[];
  /** Its forms, each with its own children; none on a write that names none. */
  variants?: readonly PickedVariant[];
}

/** One deity as `Ingredient.deities` reads it: the name the row holds and the curated deity picked, null on a typed name or once the deity or its tradition is retired. */
/** One live folk name as `Ingredient.folkNames` reads it: the row's id, so it can be promoted, and its text. */
export interface FolkNameRow {
  id: string;
  name: string;
}

export interface IngredientDeityRow {
  name: string;
  deity: DeityRow | null;
}

/** One substitute as `Ingredient.substitutes` reads it (DESIGN.md §7): the name shown, the ingredient to follow and the form the link names, each null on typed text or a deleted link. */
export interface SubstituteRow {
  name: string;
  ingredient: IngredientRow | null;
  variantId: string | null;
}

/** One reference as `Ingredient.references` reads it (DESIGN.md §7, `ReferenceLink`): the source and the locator such as "p. 112", or null. */
export interface CitedReference {
  reference: ReferenceRow;
  locator: string | null;
}

/** What the workspace service parses: the form's values, or the mutation's input. */
export type IngredientValues = z.input<typeof LocalIngredientInput>;

/** What the stock service parses: the row editor's values, or a mutation's input. */
export type StockValues = z.input<typeof StockInput>;

/** What `saveStock` takes: the stock dialog's whole Save, in three lists so a delete cannot carry a quantity. */
export interface SaveStockValues {
  create: { variantId: string; input: StockValues }[];
  update: { id: string; input: StockValues }[];
  delete: string[];
}

/** What the reference service parses: the form's values, or a mutation's input. */
export type ReferenceValues = z.input<typeof ReferenceInput>;

/** What a compendium write takes: the form's values or a mutation's input, and the confirmation that it may end another entry's redirect. */
export type CompendiumWrite = z.input<typeof CompendiumIngredientInput> & { endRedirect?: boolean };

/** A compendium entry's review mark, as a curator reads it: when it was marked reviewed. */
export interface CompendiumReview {
  reviewedAt: Date;
}

/** What a compendium address answers: the entry there, or the slug it moved to. */
export type CompendiumAddress =
  | {
      kind: 'entry';
      entry: IngredientRow;
      /** The entry that moved off this address, while its redirect's window is open. */
      movedAway: IngredientRow | null;
    }
  | { kind: 'moved'; slug: string };

/** What a compendium entry's share card draws. */
export interface CompendiumShareCard {
  name: string;
  /** The formal name, or null when there is none or it only repeats the name. */
  formalName: string | null;
  /** The entry's own categories, alphabetical, each in its group's dark-theme colour. */
  categories: { name: string; color: string }[];
  /** Each group's dark-theme colour, once, in the order its first category appears. */
  groupColors: string[];
}

/** A category as the entry page shows it: the row and the group whose colours its chip takes. */
export interface CategoryDetail {
  category: CategoryRow;
  group: CategoryGroupRow;
}

/** A deity as the entry page shows it: its name, its tradition and its other names alphabetically; tradition is null for a typed name or a retired deity, other names none for a typed name. */
export interface DeityDetail {
  name: string;
  tradition: string | null;
  otherNames: string[];
}

/** A substitute as the entry page shows it: the name, the ingredient to link and the form it names, each null as `SubstituteRecord` says. */
export interface SubstituteDetail {
  name: string;
  ingredient: Pick<IngredientRow, 'id' | 'slug' | 'workspaceId'> | null;
  form: string | null;
}

/** One form of an ingredient as its page shows it: the row, its curated form group's icon (null if uncurated) and the form's own lists. */
export interface VariantDetail {
  variant: IngredientVariantRow;
  icon: FormGroupIcon | null;
  categories: CategoryDetail[];
  substitutes: SubstituteDetail[];
  /** The form's own sources, alphabetical by citation; never its ingredient's. */
  references: CitedReference[];
}

/** An ingredient as its page shows it: the row, its own child lists and one detail per live variant in form order; both routes render this shape. */
export interface IngredientDetail {
  entry: IngredientRow;
  /** The entry is a compendium entry the curators retired, read because the coven's cupboard names it; always false on the public page. */
  retired: boolean;
  /** The cupboard entry of the coven the page is read in, null on the public page and for entries the coven does not hold; `entry` is the compendium row, with `applyCupboardEntry` laying this over it. */
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

/** A compendium entry an own entry is or may be, as its page links it. */
export interface ReplacedCompendiumEntry {
  id: string;
  slug: string;
  name: string;
  canonicalName: string | null;
}

/** The first few compendium entries an own entry is or may be, and how many in all; `same` shares the formal name's identity, `similar` the label, `none` is for a compendium entry. Display only (DESIGN.md §13, "Link to the Compendium"). */
export interface CompendiumMatches {
  kind: 'same' | 'similar' | 'none';
  entries: ReplacedCompendiumEntry[];
  total: number;
}

/** One of the viewer's own covens that holds a compendium entry: enough to name the coven and build its entry's address. */
export interface HoldingCoven {
  id: string;
  slug: string;
  name: string;
}

/** The latest edit a coven's card shows: who made it (null where the viewer cannot name the editor) and when, as ISO 8601. */
export interface LastEdit {
  by: string | null;
  at: string;
}

/** The In My Covens filter as the address gives it: the picked coven ids and whether the choice is Not In (no id means none of my covens). */
export interface CovenPick {
  covenIds: readonly string[];
  covensNot?: boolean;
}
