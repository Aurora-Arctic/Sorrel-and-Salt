import type { IngredientFixture, Overrides } from '../../../support/fixtures';

export type IngredientOverrides = Overrides<IngredientFixture>;

export type Inserted = { id: string; identityKey: string };

export interface StockRow {
  workspaceId?: string;
  ingredientId?: string;
  /** The form held; the ingredient's one seeded variant when left out. */
  variantId?: string;
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

/** What a test row of `ingredient_substitutes` links or names; both or neither is the CHECK's case. */
export type SubstituteEntry = {
  substituteId?: string | null;
  name?: string | null;
  /** The form of the parent the row stands in for. */
  variantId?: string | null;
  /** The form of the linked ingredient it names. */
  substituteVariantId?: string | null;
};

/** A test row of `ingredient_deities`: always a name, and a link when picked. */
export type DeityEntry = { deityId?: string | null; name: string; position: number };

/** A test row of `references`, its columns as Postgres names them. */
export type ReferenceFields = Partial<Record<string, string | null>>;

/** A test row of `reference_links`: the row it sources by column, and a locator. */
export type LinkFields = Partial<Record<string, string | null>>;
