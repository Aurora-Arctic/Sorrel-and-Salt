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

/** An ingredient's id beside its single columns and the lists they fill (MB.135). */
export type ListedIngredientRow = { id: string } & Record<string, string | string[] | null>;

export interface Retired {
  retired_at: string;
  expires_at: string;
}
