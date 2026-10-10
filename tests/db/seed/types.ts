import type { SeedDatabase } from '@/db/seed/types';

/**
 * One seed entry point under the shape every seed shares: a scenario, or a
 * reference-data seed run alone, and the tables that run is the seed of —
 * empty before it, filled by it, every row the bootstrap user's.
 */
export interface SeedEntry {
  name: string;
  run: (handle: SeedDatabase) => Promise<void>;
  tables: string[];
  /**
   * The inserts this entry makes as someone other than the bootstrap user:
   * fixture E's, whose privileges the trigger on `users` records stamped as
   * E (MB.195). Absent for an entry that seeds no admin.
   */
  actingAsOther?: { table_name: string; acting_user: string }[];
}

/** A `planets` or `zodiac_signs` row. */
export interface VocabularyRow {
  id: string;
  name: string;
  slug: string;
  seed_key: string | null;
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
  seed_key: string | null;
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
  planets: string[] | null;
  zodiac_signs: string[] | null;
  canonical_key: string;
  slug: string;
  created_by: string;
}

/** A tradition as the deity seed doc tables it. */
export interface DocDeityTradition {
  name: string;
  description: string;
}

/** A deity as the deity seed doc tables it, its tradition by name. */
export interface DocDeity {
  name: string;
  tradition: string;
  description: string;
}

export interface DeityTraditionRow {
  id: string;
  name: string;
  slug: string;
  seed_key: string | null;
  description: string;
  created_by: string;
  updated_by: string;
  deleted_at: Date | null;
}

export interface DeityRow {
  id: string;
  name: string;
  slug: string;
  seed_key: string | null;
  description: string;
  tradition_id: string;
  created_by: string;
  updated_by: string;
  deleted_at: Date | null;
}

/** What a seeded source links, as the seed docs name it. */
export type DocLinkKind = 'tradition' | 'deity' | 'planet' | 'zodiacSign';

/** One link a source's place in the seed docs gives it. */
export interface DocLink {
  kind: DocLinkKind;
  name: string;
  locator: string | null;
}

/** A `references` row as the sources seed writes it; its fields render as a citation. */
export interface ReferenceRow {
  id: string;
  workspace_id: string | null;
  kind: 'book' | 'chapter' | 'article' | 'entry' | 'web_page';
  title: string;
  authors: string | null;
  container: string | null;
  contributors: string | null;
  edition: string | null;
  volume: string | null;
  issue: string | null;
  series: string | null;
  place: string | null;
  publisher: string | null;
  published: string | null;
  pages: string | null;
  host: string | null;
  url: string | null;
  modified: string | null;
  accessed: string | null;
  note: string | null;
  seed_key: string | null;
  created_by: string;
  updated_by: string;
  updated_at: Date;
  deleted_at: Date | null;
}

/** A `reference_links` row. */
export interface ReferenceLinkRow {
  id: string;
  reference_id: string;
  deity_id: string | null;
  deity_tradition_id: string | null;
  planet_id: string | null;
  zodiac_sign_id: string | null;
  locator: string | null;
  created_by: string;
  updated_by: string;
  deleted_at: Date | null;
}
