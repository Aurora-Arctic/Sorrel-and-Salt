import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type { users } from '../../modules/identity/schema/users';
import type { workspaceMembers, workspaces } from '../../modules/coven/schema/workspaces';
import type { ingredients } from '../../modules/ingredients/schema/ingredients';
import type { spells } from '../../modules/grimoire/schema/spells';
import type { spellIngredients } from '../../modules/grimoire/schema/spell-ingredients';
import type { planets, zodiacSigns } from '../../modules/vocabulary/schema/astrology';
import type { categories, categoryGroups } from '../../modules/vocabulary/schema/categories';
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
export type InsertStamps = 'createdAt' | 'createdBy' | 'updatedAt' | 'updatedBy';

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

/** One compendium entry plus its folk names and categories, named rather than keyed. */
export type SeedIngredient = Pick<
  typeof ingredients.$inferInsert,
  | 'name'
  | 'canonicalName'
  | 'nomenclature'
  | 'form'
  | 'description'
  | 'element'
  | 'planet'
  | 'safetyNotes'
> & {
  folkNames?: string[];
  categories: string[];
};

// `demo`: W's own ingredients and the spells layered from both tiers.

/** W's own ingredients — the workspace tier, `workspace_id` set rather than null. */
export type SeedWorkspaceIngredient = Pick<
  typeof ingredients.$inferInsert,
  'name' | 'canonicalName' | 'nomenclature' | 'form' | 'description' | 'element'
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

/** The two pairs are typed as a union rather than a generic: their columns are identical, so the row type survives. */
export type GroupTable = typeof categoryGroups | typeof ingredientFormGroups;
export type ItemTable = typeof categories | typeof ingredientForms;

export interface TwoTierVocabulary<
  G extends { name: string; description: string },
  I extends { name: string; group: string; description: string },
> {
  groupTable: GroupTable;
  itemTable: ItemTable;
  groups: readonly G[];
  items: readonly I[];
  /** Capitalised, for the error naming an item whose group is missing: `Category`, `Form`. */
  itemNoun: string;
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

/** Typed as a union rather than a generic: the columns are identical, so the row type survives. */
export type FlatTable = typeof planets | typeof zodiacSigns;

export interface SeedAstrologyValue {
  name: string;
  description: string;
}
