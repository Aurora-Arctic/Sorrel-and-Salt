import type { PgTable } from 'drizzle-orm/pg-core';
import type { updateCompendiumEntry } from '@/modules/ingredients';

/** A `*_by` foreign key as `information_schema` reports it. */
export interface Reference {
  column_name: string;
  foreign_table: string;
  foreign_column: string;
}

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

/** A table the reference seed writes, and the least a row of it needs beside its key. */
export interface SeededTable {
  table: PgTable;
  name: string;
  row: () => Promise<Record<string, string>>;
}

/** What the compendium writes take, which the module keeps to itself. */
export type CompendiumWrite = Parameters<typeof updateCompendiumEntry>[2];
