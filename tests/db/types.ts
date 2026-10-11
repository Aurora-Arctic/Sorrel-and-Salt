import type { updateCompendiumEntry } from '@/modules/ingredients';

/** A `users` row, as far as an address change reads it. */
export interface UserRow {
  id: string;
  email: string;
  email_verified: boolean;
  updated_by: string;
  created_at: Date;
  updated_at: Date;
  verification_sent_at: Date | null;
}

/**
 * What a null session gets: an answer, a refusal at the field, or — for a
 * null sent where the SDL requires an id — a request refused before any
 * resolver runs.
 */
export type Outcome = 'answers' | 'refuses' | 'invalid';

/** A `Query` or `Mutation` field's probe, and what it gives a null session. */
export interface ScopeProbe {
  source: string;
  variables?: Record<string, unknown>;
  outcome: Outcome;
}

/**
 * What an admin write changes: the closed list of what a site admin governs —
 * the curated reference data (CLAUDE.md, "Admins curate …"), who may create
 * a coven (M5.8) and who is an admin (MB.59) — so a write outside it is a new
 * entry here that a reviewer reads, not a line in a probe table. A coven's
 * contents are never on it (M6.6).
 */
export type Governed =
  | 'compendium'
  | 'references'
  | 'categories'
  | 'category groups'
  | 'forms'
  | 'form groups'
  | 'planets'
  | 'zodiac signs'
  | 'deities'
  | 'deity traditions'
  | 'workspace creation'
  | 'admin role';

/**
 * A `Mutation` field only a site admin's scope admits. `probe` stands in for
 * the field's null-session probe where that one does not ask for the admin's
 * tier — a reference write names a coven there.
 */
export interface AdminWrite {
  governs: Governed;
  probe?: ScopeProbe;
}

/**
 * A field taking a `workspaceId`. `variables` is a thunk: the ids it names
 * exist only once `beforeAll` has run.
 */
export interface WorkspaceIdProbe {
  source: string;
  variables?: () => Record<string, unknown>;
}

/** A GraphQL response body, as far as a probe reads it. */
export interface Answer {
  data?: Record<string, unknown> | null;
  errors?: { path?: (string | number)[]; extensions?: { code?: string } }[];
}

/** What the compendium writes take, which the module keeps to itself. */
export type CompendiumWrite = Parameters<typeof updateCompendiumEntry>[2];

/** A row as the raw client writes and returns it. */
export type Row = Record<string, unknown>;

/**
 * How the partial-unique sweep builds a row inside one index's predicate.
 * `row` makes a fresh, valid live row every call; `clash` names the columns a
 * second row copies from the first to collide on this index alone, where the
 * catalogue's own list would collide on another index first or names a
 * generated column.
 */
export interface PartialIndexRow {
  row: () => Promise<Row>;
  clash?: string[];
}

/** A partial unique index as the catalogue reports it: every column it reads, predicate included. */
export interface PartialUniqueIndex {
  index: string;
  table: string;
  columns: string[];
}

/** One `user_privilege_changes` row as the trigger tests read it, the enums cast to text. */
export interface PrivilegeLedgerRow {
  user_id: string;
  privilege: string;
  change: string;
  via: string;
  note: string | null;
  created_at: Date;
  created_by: string;
  updated_by: string;
}
