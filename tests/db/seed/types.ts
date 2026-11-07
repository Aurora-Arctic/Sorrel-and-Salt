import type { SeedDatabase, SeedRunOptions } from '@/db/seed/types';

export interface SeedEntry {
  name: string;
  prepare?: (handle: SeedDatabase) => Promise<void>;
  seed: (handle: SeedDatabase, options?: SeedRunOptions) => Promise<unknown>;
  fillSeed?: (handle: SeedDatabase) => Promise<void>;
  run: (handle: SeedDatabase) => Promise<void>;
  tables: string[];
}

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

export type DocLinkKind = 'tradition' | 'deity' | 'celestialBody' | 'zodiacSign';

export interface DocLink {
  kind: DocLinkKind;
  name: string;
  locator: string | null;
}

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
  scholarly: boolean;
  seed_key: string | null;
  created_by: string;
  updated_by: string;
  updated_at: Date;
  deleted_at: Date | null;
}

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
