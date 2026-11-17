import { getTableColumns } from 'drizzle-orm';
import type { PgColumn, PgTable } from 'drizzle-orm/pg-core';
import { ingredients } from '../../modules/ingredients/schema/ingredients';

// The column no finder reads with the rest of its row: `curator_reviewed_by`. Compendium reads are cached and shared (rule 6), and a row
// spread into a client component reaches the browser whole, so the name is left out where the row is read. `curator_reviewed_at` is public and stays.
// A curator reads the mark through `findCompendiumReview`, the seed through its own queries; a writer's `returning()` holds both.

// `types.ts`'s `UnreadIngredientColumn` names the same one, for the row type.
const UNREAD = new Map<PgTable, ReadonlySet<string>>([
  [ingredients, new Set(['curatorReviewedBy'])],
]);

/** Whether a read of `table`'s rows leaves a column out. */
export const hidesColumns = (table: PgTable): boolean => UNREAD.has(table);

/** `table`'s columns as a finder reads them: every one bar those `UNREAD` names. */
export function readColumns(table: PgTable): Record<string, PgColumn> {
  const columns: Record<string, PgColumn> = getTableColumns(table);
  const unread = UNREAD.get(table);
  if (!unread) return columns;
  return Object.fromEntries(Object.entries(columns).filter(([name]) => !unread.has(name)));
}

/** `table`’s read columns, only those `names` lists. A name that is not a read column throws, so a rename cannot quietly drop a field. */
export function pickColumns(table: PgTable, names: readonly string[]): Record<string, PgColumn> {
  const read = readColumns(table);
  return Object.fromEntries(
    names.map((name) => {
      const column = read[name];
      if (!column) throw new Error(`No readable column '${name}' to project`);
      return [name, column];
    }),
  );
}
