import type { SeedDatabase, SeedRunOptions } from '@/db/seed/types';

/** One seed entry point under the shape every seed shares: a scenario, or a reference-data seed run alone, and the tables that run is the seed of (empty before it, filled by it, every row the bootstrap user's). */
export interface SeedEntry {
  name: string;
  /** The seeds this one reads from, run for real first. */
  prepare?: (handle: SeedDatabase) => Promise<void>;
  /** The seed itself, which a dry run rolls back. */
  seed: (handle: SeedDatabase, options?: SeedRunOptions) => Promise<void>;
  /** The seed the fill sweep runs in place of `seed`, when the other sweeps take a smaller input: the compendium's real files, where they take the fixture. */
  fillSeed?: (handle: SeedDatabase) => Promise<void>;
  /** `prepare`, then `seed`. */
  run: (handle: SeedDatabase) => Promise<void>;
  tables: string[];
}

/** A `celestial_bodies` or `zodiac_signs` row. */
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

export interface UserRow {
  id: string;
  email: string;
  role: 'user' | 'admin';
  can_create_workspace: boolean;
  created_by: string;
  updated_by: string;
  deleted_at: Date | null;
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
export type DocLinkKind = 'tradition' | 'deity' | 'celestialBody' | 'zodiacSign';

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
  celestial_body_id: string | null;
  zodiac_sign_id: string | null;
  locator: string | null;
  created_by: string;
  updated_by: string;
  deleted_at: Date | null;
}
