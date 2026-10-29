import { getTableColumns } from 'drizzle-orm';
import type { PgColumn, PgTable } from 'drizzle-orm/pg-core';
import { ingredients } from '../../modules/ingredients/schema/ingredients';

// The column no finder reads with the rest of its row: the curator who marked a
// compendium entry reviewed, `curator_reviewed_by`. The compendium's
// reads are cached and shared by every viewer (CLAUDE.md, rule 6), and a row a server
// page spreads into a client component reaches the browser whole, so the name is left
// out where the row is read rather than stripped by each caller. The date,
// `curator_reviewed_at`, is public (the mark shows to
// everyone, and who marked it to no one), so it stays on the row. A curator reads the
// mark through `findCompendiumReview`, and the seed through its own queries
// (`src/db/seed/compendium.ts`), neither of which comes through here. A writer's
// `returning()` still holds both.

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
