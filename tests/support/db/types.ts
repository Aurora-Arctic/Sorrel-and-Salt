import type { PgTable } from 'drizzle-orm/pg-core';
import type postgres from 'postgres';

export interface IndexRow {
  unique: boolean;
  /** As Postgres renders it — `(deleted_at IS NULL)` — or `null` on a plain index. */
  predicate: string | null;
  definition: string;
}

export interface CatalogueReads {
  /** Every column of `table`, sorted by name. */
  columnNames(table: string): Promise<string[]>;
  /** One of `table`'s indexes, or `undefined` when it carries none by that name. */
  indexRow(table: string, name: string): Promise<IndexRow | undefined>;
}

export interface ForeignKeyFacts {
  /** The referencing column, on the table the facts were read from. */
  column: string;
  /** The constraint name, as Postgres reports it in `constraint_name`. */
  name: string;
  foreignColumnName: string;
  foreignTable: PgTable;
}

/** One statement a test's logging database client sent, with its bound parameters. */
export interface Logged {
  query: string;
  params: unknown[];
}

/**
 * A `references` row's columns as a test seeds them, by the table's own names
 * — `workspace_id` null for the compendium — each optional over a compendium
 * book's defaults.
 */
export interface ReferenceSeed {
  workspace_id?: string | null;
  kind?: string;
  title?: string;
  authors?: string | null;
  container?: string | null;
  place?: string | null;
  published?: string | null;
  url?: string | null;
  accessed?: string | null;
}

/** What `postgres()` takes beside a URL, as bounded-postgres.ts passes it on. */
export type ClientOptions = postgres.Options<Record<string, postgres.PostgresType>> | undefined;
