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

/** What a null session gets: an answer, a refusal at the field, or, for a null sent where the SDL requires an id, a refusal before any resolver runs. */
export type Outcome = 'answers' | 'nulls' | 'refuses' | 'invalid';

/** A `Query` or `Mutation` field's probe, and what it gives a null session. */
export interface ScopeProbe {
  source: string;
  variables?: Record<string, unknown>;
  outcome: Outcome;
}

/** What an admin write changes: the closed list of what a site admin governs (CLAUDE.md, "Admins curate …"), so a write outside it is a new entry a reviewer reads. A coven's contents are never on it. */
export type Governed =
  | 'support'
  | 'compendium'
  | 'references'
  | 'categories'
  | 'category groups'
  | 'forms'
  | 'form groups'
  | 'celestialBodies'
  | 'zodiac signs'
  | 'deities'
  | 'deity traditions'
  | 'workspace creation'
  | 'site role';

/** A `Mutation` field only a site admin's scope admits. `probe` replaces the null-session probe where that one does not ask for the admin's tier. */
export interface AdminWrite {
  governs: Governed;
  probe?: ScopeProbe;
}

/** A field taking a `workspaceId`. `variables` is a thunk because the ids exist only after `beforeAll`. */
export interface WorkspaceIdProbe {
  source: string;
  variables?: () => Record<string, unknown>;
  /** Runs as W's owner, A, for a field only an owner is admitted to; B otherwise. */
  asOwner?: boolean;
  /** The workspace the admitted call names instead of W, for a field that destroys what it is given: a coven of its own, so W stands for the rest. */
  admittedTo?: () => string;
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

/** How the partial-unique sweep builds a row inside one index's predicate: `row` makes a fresh live row each call; `clash` names the columns a second row copies to collide on this index alone. */
export interface PartialIndexRow {
  row: () => Promise<Row>;
  clash?: string[];
  /** The table has no tombstone: its index is partial on something else, so the holder is deleted outright to free the slot. */
  hardDeleted?: true;
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
