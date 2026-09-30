import type { PgTable } from 'drizzle-orm/pg-core';

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
  /** `table`'s unique indexes, the primary key's included, sorted by name. */
  uniqueIndexNames(table: string): Promise<string[]>;
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
