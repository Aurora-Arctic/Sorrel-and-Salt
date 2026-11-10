import type { updateCompendiumEntry } from '@/modules/ingredients';

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
 * What a null session gets: an answer, a refusal at the field, a NotFound from a resolver that takes no session but found
 * nothing for the probe's argument, or, for a null sent where the SDL requires an id, a refusal before any resolver runs.
 */
export type Outcome = 'answers' | 'nulls' | 'refuses' | 'not-found' | 'invalid';

export interface ScopeProbe {
  source: string;
  variables?: Record<string, unknown>;
  outcome: Outcome;
}

/** What a keeper write changes: the closed list of what a site keeper governs (CLAUDE.md, "Admins curate …"), so a write outside it is a new entry a reviewer reads. A coven's contents are never on it. */
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
  | 'site role'
  | 'site access'
  | 'documents'
  | 'help';

/** A `Mutation` field only a site admin's scope admits. `probe` replaces the null-session probe where that one does not ask for the keeper's tier. */
export interface AdminWrite {
  governs: Governed;
  probe?: ScopeProbe;
}

export interface WorkspaceIdProbe {
  source: string;
  variables?: () => Record<string, unknown>;
  asOwner?: boolean;
  /** The workspace the admitted call names instead of W, for a field that destroys what it is given: a coven of its own, so W stands for the rest. */
  admittedTo?: () => string;
}

export interface Answer {
  data?: Record<string, unknown> | null;
  errors?: { path?: (string | number)[]; extensions?: { code?: string } }[];
}

export type CompendiumWrite = Parameters<typeof updateCompendiumEntry>[2];

export type Row = Record<string, unknown>;

/** How the partial-unique sweep builds a row inside one index's predicate: `row` makes a fresh live row each call; `clash` names the columns a second row copies to collide on this index alone. */
export interface PartialIndexRow {
  row: () => Promise<Row>;
  clash?: string[];
  /** The table has no tombstone: its index is partial on something else, so the holder is deleted outright to free the slot. */
  hardDeleted?: true;
}

export interface PartialUniqueIndex {
  index: string;
  table: string;
  columns: string[];
}

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
