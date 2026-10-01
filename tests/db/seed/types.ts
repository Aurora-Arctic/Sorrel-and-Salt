/** A `planets` or `zodiac_signs` row. */
export interface VocabularyRow {
  id: string;
  name: string;
  slug: string;
  description: string;
  created_by: string;
  updated_by: string;
  deleted_at: Date | null;
}

/** A category group as DESIGN.md §6 tables it. */
export interface DesignCategoryGroup {
  name: string;
  slug: string;
  categories: string[];
}

export interface CategoryGroupRow {
  id: string;
  name: string;
  slug: string;
  color_dark: string;
  color_light: string;
  description: string;
  created_by: string;
  updated_by: string;
  deleted_at: Date | null;
}

export interface CategoryRow {
  id: string;
  name: string;
  slug: string;
  description: string;
  group_id: string;
  created_by: string;
  updated_by: string;
  deleted_at: Date | null;
}

/** A form group as DESIGN.md §5 tables it. */
export interface DesignFormGroup {
  name: string;
  forms: string[];
}

export interface FormGroupRow {
  id: string;
  name: string;
  slug: string;
  description: string;
  created_by: string;
  updated_by: string;
  deleted_at: Date | null;
}

export interface FormRow {
  id: string;
  name: string;
  slug: string;
  description: string;
  group_id: string;
  created_by: string;
  updated_by: string;
  deleted_at: Date | null;
}

export interface SpellRow {
  id: string;
  workspace_id: string;
  title: string;
  intent: string | null;
  status: 'draft' | 'complete';
  created_by: string;
  updated_by: string;
  deleted_at: Date | null;
}

/** A `spell_ingredients` row: one layer of a spell. */
export interface LayerRow {
  spell_id: string;
  ingredient_id: string | null;
  name: string | null;
  form: string | null;
  quantity: string | null;
  unit: string | null;
  layer_order: number;
  note: string | null;
  created_by: string;
  deleted_at: Date | null;
}

/**
 * An `ingredients` row as far as its slug: the slug, and the label, form and
 * formal name it is built from.
 */
export interface IngredientSlugRow {
  id: string;
  workspace_id: string | null;
  name: string;
  canonical_name: string | null;
  form: string | null;
  slug: string;
}

export interface UserRow {
  id: string;
  email: string;
  role: 'user' | 'admin';
  can_create_workspace: boolean;
  created_by: string;
  updated_by: string;
  deleted_at: Date | null;
}

export interface MemberRow {
  workspace_id: string;
  user_id: string;
  role: 'viewer' | 'member' | 'owner';
  created_by: string;
}

/** A compendium entry’s `ingredients` row. */
export interface CompendiumEntryRow {
  id: string;
  workspace_id: string | null;
  name: string;
  canonical_name: string | null;
  nomenclature: string;
  form: string | null;
  planet: string | null;
  canonical_key: string;
  slug: string;
  created_by: string;
}
