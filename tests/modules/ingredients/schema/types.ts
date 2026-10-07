import type { IngredientFixture, Overrides } from '../../../support/fixtures';

export type IngredientCategoryPair = { ingredientId: string; categoryId: string };

export type IngredientOverrides = Overrides<IngredientFixture>;

export type Inserted = { id: string; canonicalKey: string };

export interface StockRow {
  workspaceId?: string;
  ingredientId?: string;
  quantity?: string | null;
  unit?: string | null;
  dimension?: string | null;
  threshold?: string | null;
  source?: string | null;
  acquiredDate?: string | null;
}

/** One `information_schema.columns` row, as ingredient-lists.test.ts reads it. */
export interface ColumnRow {
  column_name: string;
  data_type: string;
  udt_name: string;
  is_nullable: string;
  column_default: string | null;
}

/** An ingredient's id beside its single `element` and the list it fills (MB.158). */
export type ListedIngredientRow = { id: string } & Record<string, string | string[] | null>;

export interface Retired {
  retired_at: string;
  expires_at: string;
}

/** An `ingredient_substitutes` row as the fill test reads it (MB.139). */
export interface SubstituteRow {
  ingredient_id: string;
  substitute_id: string | null;
  name: string | null;
  created_by: string;
  updated_by: string;
  deleted_at: Date | null;
}

/** What a test row of `ingredient_substitutes` links or names; both or neither is the CHECK's case. */
export type SubstituteEntry = { substituteId?: string | null; name?: string | null };

/** A row of `ingredient_deities` as the fill tests read it back (MB.166). */
export interface DeityRow {
  ingredient_id: string;
  deity_id: string | null;
  name: string;
  position: number;
  created_by: string;
  updated_by: string;
  deleted_at: Date | null;
}

/** A test row of `ingredient_deities`: always a name, and a link when picked (MB.165). */
export type DeityEntry = { deityId?: string | null; name: string; position: number };

/** A test row of `references`, its columns as Postgres names them (MB.152). */
export type ReferenceFields = Partial<Record<string, string | null>>;

/** A test row of `reference_links`: the row it sources by column, and a locator (MB.152). */
export type LinkFields = Partial<Record<string, string | null>>;
