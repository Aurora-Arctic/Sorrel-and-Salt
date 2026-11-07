import type { PgTable } from 'drizzle-orm/pg-core';
import type postgres from 'postgres';

export interface IndexRow {
  unique: boolean;
  predicate: string | null;
  definition: string;
}

export interface CatalogueReads {
  columnNames(table: string): Promise<string[]>;
  indexRow(table: string, name: string): Promise<IndexRow | undefined>;
}

export interface ForeignKeyFacts {
  column: string;
  columns: string[];
  name: string;
  foreignColumnNames: string[];
  foreignTable: PgTable;
}

export interface Logged {
  query: string;
  params: unknown[];
}

export interface ReferenceSeed {
  workspace_id?: string | null;
  kind?: string;
  title?: string;
  authors?: string | null;
  container?: string | null;
  place?: string | null;
  published?: string | null;
  url?: string | null;
  modified?: string | null;
  accessed?: string | null;
}

export type ClientOptions = postgres.Options<Record<string, postgres.PostgresType>> | undefined;
