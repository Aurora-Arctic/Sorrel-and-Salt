import type { PgInsertValue } from 'drizzle-orm/pg-core';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type { users } from '../../modules/identity/schema/users';
import type { workspaceMembers, workspaces } from '../../modules/coven/schema/workspaces';
import type { ingredients } from '../../modules/ingredients/schema/ingredients';
import type { spells } from '../../modules/grimoire/schema/spells';
import type { spellIngredients } from '../../modules/grimoire/schema/spell-ingredients';
import type { planets, zodiacSigns } from '../../modules/vocabulary/schema/astrology';
import type { categories, categoryGroups } from '../../modules/vocabulary/schema/categories';
import type { deities, deityTraditions } from '../../modules/vocabulary/schema/deities';
import type { CitationFields } from '../../lib/types';
import type { StampField } from '../types';
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
 * One compendium entry plus its folk names, deities and categories, named
 * rather than keyed. Its form and each deity are picked by that name from the
 * curated rows (MB.167), so each must name exactly one.
 */
export type SeedIngredient = Pick<
  typeof ingredients.$inferInsert,
  | 'name'
  | 'canonicalName'
  | 'nomenclature'
  | 'form'
  | 'description'
  | 'elements'
  | 'planets'
  | 'zodiacSigns'
  | 'safetyNotes'
> & {
  folkNames?: string[];
  deities?: string[];
  categories: string[];
};

// `demo`: W's own ingredients and the spells layered from both tiers.

/** W's own ingredients — the workspace tier, `workspace_id` set rather than null. */
export type SeedWorkspaceIngredient = Pick<
  typeof ingredients.$inferInsert,
  'name' | 'canonicalName' | 'nomenclature' | 'form' | 'description' | 'elements'
>;

/** What a layer points at: an ingredient in either tier, or a custom row carrying its own name and form. */
export type SeedLayerIngredient =
  | {
      tier: 'compendium' | 'workspace';
      entry: { name: string; canonicalName?: string | null; form?: string | null };
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

// The reference vocabularies: each shape's tables, then the rows filed in them.

/** The group tables are typed as a union rather than a generic: the columns the seed writes are common to all three, so the row type survives. */
export type GroupTable =
  typeof categoryGroups | typeof ingredientFormGroups | typeof deityTraditions;
/** A generic over this union, not the union itself: `deities` names its key `traditionId`, the others `groupId`. */
export type ItemTable = typeof categories | typeof ingredientForms | typeof deities;

/** What every item row carries before its foreign key to its group. */
export interface TwoTierItemRow {
  name: string;
  slug: string;
  seedKey: string;
  description: string;
}

export interface TwoTierVocabulary<
  G extends { name: string; description: string },
  I extends { name: string; description: string },
  T extends ItemTable,
> {
  groupTable: GroupTable;
  itemTable: T;
  groups: readonly G[];
  items: readonly I[];
  /** The `name` of the group an item is filed under: `category.group`, `deity.tradition`. */
  groupOf: (item: I) => string;
  /** The item's row with its group's id under the table's own key: `{ ...row, groupId }`. */
  toItemRow: (row: TwoTierItemRow, groupId: string) => Omit<PgInsertValue<T>, InsertStamps>;
  /** Capitalised, for the error naming an item whose group is missing: `Category`, `Form`, `Deity`. */
  itemNoun: string;
  /**
   * The item's slug, given the name of the group it is filed under now:
   * `slugify(item.name)` when absent. A form's carries its group (M5.6a),
   * and a deity's its tradition (MB.132), so two items of one name under two
   * groups hold two addresses.
   */
  slugOf?: (item: I, groupName: string) => string;
}

export interface SeedCategoryGroup {
  name: string;
  colorDark: string;
  colorLight: string;
  description: string;
}

export interface SeedCategory {
  name: string;
  /** The `name` of the group in CATEGORY_GROUPS this belongs to. */
  group: string;
  description: string;
}

export interface SeedIngredientFormGroup {
  name: string;
  description: string;
}

export interface SeedIngredientForm {
  name: string;
  /** The `name` of the group in FORM_GROUPS this belongs to. */
  group: string;
  description: string;
}

export interface SeedDeityTradition {
  name: string;
  description: string;
}

export interface SeedDeity {
  name: string;
  /** The `name` of the tradition in DEITY_TRADITIONS this is filed under. */
  tradition: string;
  description: string;
}

/** Typed as a union rather than a generic: the columns are identical, so the row type survives. */
export type FlatTable = typeof planets | typeof zodiacSigns;

export interface SeedAstrologyValue {
  name: string;
  description: string;
}

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

/** A `reference_links` row the sources seed wants, before its stamps. */
export interface SeedSourceLink {
  referenceId: string;
  deityId?: string;
  deityTraditionId?: string;
  planetId?: string;
  zodiacSignId?: string;
  locator: string | null;
}

/** A link's identity, as the seed wants it or as `reference_links` holds it. */
export type SeedSourceLinkKey = Pick<SeedSourceLink, 'referenceId'> & {
  [column in 'deityId' | 'deityTraditionId' | 'planetId' | 'zodiacSignId']?: string | null;
};

/** A table a seeded source links, found by the `seed_key` its own seed gave each row. */
export type SourceTargetTable =
  typeof deityTraditions | typeof deities | typeof planets | typeof zodiacSigns;
