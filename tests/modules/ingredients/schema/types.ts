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

export interface Retired {
  retired_at: string;
  expires_at: string;
}
