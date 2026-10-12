import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type { users } from '../../modules/identity/schema/users';
import type { workspaceMembers, workspaces } from '../../modules/coven/schema/workspaces';
import type { ingredients } from '../../modules/ingredients/schema/ingredients';
import type { ingredientVariants } from '../../modules/ingredients/schema/ingredient-variants';
import type { spells } from '../../modules/grimoire/schema/spells';
import type {
  referenceLinks,
  SOURCED,
  SourcedKey,
} from '../../modules/ingredients/schema/reference-links';
import type { spellIngredients } from '../../modules/grimoire/schema/spell-ingredients';
import type { categories, categoryGroups } from '../../modules/vocabulary/schema/categories';
import type { deities, deityTraditions } from '../../modules/vocabulary/schema/deities';
import type { CitationFields } from '../../lib/types';
import type { StampField } from '../types';
import type { FlatTable, ItemTable, TwoTierPair } from '../vocabularies';
import type {
  ingredientFormGroups,
  ingredientForms,
} from '../../modules/vocabulary/schema/ingredient-forms';

/**
 * What `drizzle(client)` returns: bare `PostgresJsDatabase` defaults its schema
 * to `Record<string, never>`, which a real handle is not assignable to.
 */
export type SeedDatabase = PostgresJsDatabase<Record<string, unknown>>;

/** The handle inside `db.transaction()`, so a seed module can run inside the caller's transaction. */
export type SeedTransaction = Parameters<Parameters<SeedDatabase['transaction']>[0]>[0];

/** The stamps `applyAudit('insert', …)` supplies, so a caller's row is typed without them. */
export type InsertStamps = StampField;

/** Typed against the insert model, so a column renamed in users.ts fails here. */
export type SeedUser = Pick<typeof users.$inferInsert, 'id' | 'name' | 'email' | 'role'>;

// `standard`: the fixture cast, W and X, and the compendium.

/**
 * `id` is required rather than picked: the table defaults it, and a test
 * asserting against A has to name one id.
 */
export type FixtureUser = Pick<
  typeof users.$inferInsert,
  'name' | 'email' | 'role' | 'canCreateWorkspace'
> & { id: string };

export type SeedWorkspace = Pick<typeof workspaces.$inferInsert, 'name'> & { id: string };

export type SeedMembership = Pick<
  typeof workspaceMembers.$inferInsert,
  'workspaceId' | 'userId' | 'role'
>;

/**
 * One form of a seeded entry and what that form adds (MB.222): its own
 * description and safety note. A compendium form is picked by name from the
 * curated rows (MB.167), so it must name exactly one; a coven's is typed.
 */
export type SeedVariant = Pick<typeof ingredientVariants.$inferInsert, 'form'> &
  Partial<Pick<typeof ingredientVariants.$inferInsert, 'description' | 'safetyNotes'>>;

/**
 * One compendium entry plus its forms, folk names, deities and categories,
 * named rather than keyed. Each deity is picked by that name from the curated
 * rows (MB.167), so each must name exactly one.
 */
export type SeedIngredient = Pick<
  typeof ingredients.$inferInsert,
  | 'name'
  | 'canonicalName'
  | 'nomenclature'
  | 'description'
  | 'elements'
  | 'planets'
  | 'zodiacSigns'
  | 'safetyNotes'
> & {
  variants: SeedVariant[];
  folkNames?: string[];
  deities?: string[];
  categories: string[];
};

// `demo`: W's own ingredients and the spells layered from both tiers.

/** W's own ingredients — the workspace tier, `workspace_id` set rather than null — and their forms. */
export type SeedWorkspaceIngredient = Pick<
  typeof ingredients.$inferInsert,
  'name' | 'canonicalName' | 'nomenclature' | 'description' | 'elements'
> & { variants: SeedVariant[] };

/** What a layer points at: an ingredient in either tier, or a custom row carrying its own name and form. */
export type SeedLayerIngredient =
  | {
      tier: 'compendium' | 'workspace';
      entry: { name: string; canonicalName?: string | null };
    }
  | { tier: 'custom'; name: string; form: string };

/** One layer. `layerOrder` is its position in `SeedSpell['layers']`, so two layers cannot share a depth. */
export type SeedLayer = Pick<typeof spellIngredients.$inferInsert, 'quantity' | 'unit' | 'note'> & {
  ingredient: SeedLayerIngredient;
};

export type SeedSpell = Pick<
  typeof spells.$inferInsert,
  | 'title'
  | 'intent'
  | 'jarSize'
  | 'sealWaxColor'
  | 'moonPhase'
  | 'dayOfWeek'
  | 'instructions'
  | 'status'
> & {
  id: string;
  /** §6 categories by name — what the spell *intends*, never what its contents imply (§9). */
  categories: string[];
  layers: SeedLayer[];
};

// The reference vocabularies: the shape the two-tier ones share, then the
// rows filed in each. Their tables are listed once, in src/db/vocabularies.ts.

/** What every item row carries before its foreign key to its group. */
export type TwoTierItemRow = Pick<
  ItemTable['$inferInsert'],
  'name' | 'slug' | 'seedKey' | 'description'
>;

export interface TwoTierVocabulary<
  G extends { name: string; description: string },
  I extends { name: string; description: string },
> {
  /** The item and group tables, and the item's key to its group: an entry of `TWO_TIER`. */
  vocabulary: TwoTierPair;
  groups: readonly G[];
  items: readonly I[];
  /** The `name` of the group an item is filed under: `category.group`, `deity.tradition`. */
  groupOf: (item: I) => string;
  /** Capitalised, for the error naming an item whose group is missing: `Category`, `Form`, `Deity`. */
  itemNoun: string;
  /**
   * An item's slug, given its name and the name of the group it is filed
   * under now: `slugify(name)` when absent. A form's carries its group
   * (M5.6a), and a deity's its tradition (MB.132), so two items of one name
   * under two groups hold two addresses. Given, every live item's slug is
   * brought to it on each run too.
   */
  slugOf?: (name: string, groupName: string) => string;
}

// Each literal's row typed against its table's insert model, so a column
// renamed in the schema fails here rather than at the seed's insert.

export type SeedCategoryGroup = Pick<
  typeof categoryGroups.$inferInsert,
  'name' | 'colorDark' | 'colorLight' | 'description'
>;

export type SeedCategory = Pick<typeof categories.$inferInsert, 'name' | 'description'> & {
  /** The `name` of the group in CATEGORY_GROUPS this belongs to. */
  group: string;
};

export type SeedIngredientFormGroup = Pick<
  typeof ingredientFormGroups.$inferInsert,
  'name' | 'description'
>;

export type SeedIngredientForm = Pick<
  typeof ingredientForms.$inferInsert,
  'name' | 'description'
> & {
  /** The `name` of the group in FORM_GROUPS this belongs to. */
  group: string;
};

export type SeedDeityTradition = Pick<typeof deityTraditions.$inferInsert, 'name' | 'description'>;

export type SeedDeity = Pick<typeof deities.$inferInsert, 'name' | 'description'> & {
  /** The `name` of the tradition in DEITY_TRADITIONS this is filed under. */
  tradition: string;
};

export type SeedAstrologyValue = Pick<FlatTable['$inferInsert'], 'name' | 'description'>;

/** A link from a seeded source to a deity, with where in the work it points. */
export interface SeedSourceDeity {
  name: string;
  locator?: string;
}

/**
 * One source the vocabulary seed docs record, and the curated rows it
 * supports, each named as its seed literal names it. A tradition's source
 * reaches every deity filed under it as well.
 */
export interface SeedSource {
  reference: CitationFields;
  traditions?: string[];
  deities?: SeedSourceDeity[];
  planets?: string[];
  zodiacSigns?: string[];
}

/** A `reference_links` row the sources seed wants, before its stamps: a curated row's link. */
export type SeedSourceLink = Pick<
  typeof referenceLinks.$inferInsert,
  'referenceId' | 'deityId' | 'deityTraditionId' | 'planetId' | 'zodiacSignId' | 'locator'
>;

/** A table a seeded source links, found by the `seed_key` its own seed gave each row: a vocabulary, never an ingredient or its form. */
export type SourceTargetTable = (typeof SOURCED)[Exclude<
  SourcedKey,
  'ingredientId' | 'ingredientVariantId'
>]['table'];

// The compendium seed (MB.242): the production compendium's entries, sharded,
// each field traced to a source its citations name.

/** A compendium entry's fields a citation may support, by the literal's own names. */
export type CompendiumEntryField =
  | 'name'
  | 'canonicalName'
  | 'nomenclature'
  | 'description'
  | 'elements'
  | 'planets'
  | 'zodiacSigns'
  | 'colors'
  | 'safetyNotes'
  | 'folkNames'
  | 'deities'
  | 'categories'
  | 'substitutes';

/** A form's fields a citation may support. Deities and folk names are the entry's alone (MB.215). */
export type CompendiumVariantField =
  | 'form'
  | 'description'
  | 'safetyNotes'
  | 'elements'
  | 'planets'
  | 'zodiacSigns'
  | 'colors'
  | 'categories'
  | 'substitutes';

/**
 * One citation: a source by its handle — a shared work in `WORKS` or one of
 * the shard's own `sources` — where in it, and which fields it backs.
 */
export interface SeedCitation<Field extends string> {
  source: string;
  /** `p. 112`, `under "Mugwort"`: required of a book or a chapter. */
  locator?: string;
  supports: readonly Field[];
}

/**
 * What may stand in: an entry the seed writes, by its identity — the formal
 * name lower-cased, or the label without one — and optionally one of its
 * forms; or a name typed for an entry a later shard writes.
 */
export type SeedSubstitute = { identity: string; form?: string } | { name: string };

/** One form of a compendium entry, and what that form adds to it (MB.215). */
export type SeedCompendiumVariant = Pick<typeof ingredientVariants.$inferInsert, 'form'> &
  Partial<
    Pick<
      typeof ingredientVariants.$inferInsert,
      'description' | 'safetyNotes' | 'elements' | 'planets' | 'zodiacSigns' | 'colors'
    >
  > & {
    categories?: string[];
    substitutes?: SeedSubstitute[];
    references: SeedCitation<CompendiumVariantField>[];
  };

/**
 * One compendium entry, every curated value named as its seed literal names
 * it: forms, categories and deities picked by the key their seed gave them,
 * planets and signs stored in their row's current spelling.
 */
export type SeedCompendiumEntry = Pick<
  typeof ingredients.$inferInsert,
  | 'name'
  | 'canonicalName'
  | 'nomenclature'
  | 'description'
  | 'elements'
  | 'planets'
  | 'zodiacSigns'
  | 'colors'
  | 'safetyNotes'
> & {
  folkNames?: string[];
  deities?: string[];
  categories?: string[];
  substitutes?: SeedSubstitute[];
  references: SeedCitation<CompendiumEntryField>[];
  variants: SeedCompendiumVariant[];
};

/** One shard: its entries and the per-entry pages they cite, by handle. */
export interface SeedCompendiumShard {
  name: string;
  sources: Record<string, CitationFields>;
  entries: SeedCompendiumEntry[];
}
