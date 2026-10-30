import type { PgTable } from 'drizzle-orm/pg-core';
import type { NamedWrites } from './types';

/**
 * Marks a table as written only through its own named writer methods, taking it off every generic one. A cast and nothing more, so drizzle-kit and
 * every query see the same object (claude-docs/db/write-path.md, "Table marks").
 */
export function namedWrites<TTable extends PgTable>(table: TTable): TTable & NamedWrites {
  return table as TTable & NamedWrites;
}
