import type { PgTable } from 'drizzle-orm/pg-core';
import type { NamedWrites } from './types';

/**
 * Marks a table as written only through its own named writer methods, which
 * takes it off every generic one (MB.198). A cast and nothing more: no
 * property is added, so drizzle-kit and every query see the same object, and
 * the refusal is the type's alone (claude-docs/db/write-path.md, "Table marks").
 */
export function namedWrites<TTable extends PgTable>(table: TTable): TTable & NamedWrites {
  return table as TTable & NamedWrites;
}
