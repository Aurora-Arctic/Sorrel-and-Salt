import { eq, sql } from 'drizzle-orm';
import { spells } from '../../modules/grimoire/schema/spells';
import type { Membership } from '@/modules/coven';
import type { PageEntry, PageRequest } from '../../lib/types';
import { findPageInReadableSpells } from './finders';
import type { GrimoireQuery, SortPart } from './types';

// The grimoire list's read (M10.9). In a file of its own rather than in
// `spells.ts`, because `finders.ts` imports `readableSpells` from there and
// this pages through `finders.ts`: the two in one file would import each other.

/** An instant, newest first: a page's key is ascending, so it is negated. */
const newestFirst = (column: typeof spells.updatedAt | typeof spells.createdAt): SortPart => ({
  // `numeric` keeps the microseconds a `Date` would drop from a cursor.
  expression: sql`-extract(epoch from ${column})`,
  type: 'numeric',
});

/**
 * The grimoire's orders, each a cursor key that the page's id follows, so
 * spells tied on every part still page once each. Every part must be NOT
 * NULL, because the cursor compares the key as one row value. A title is NOT
 * NULL today, but M13.15 lets a draft go untitled, so `TITLE_ASC` sorts on
 * "is it untitled" first — untitled spells last — then on the title with a
 * null read as empty, rather than on the bare column.
 */
const GRIMOIRE_ORDER: Record<GrimoireQuery['order'], readonly SortPart[]> = {
  UPDATED_DESC: [newestFirst(spells.updatedAt)],
  CREATED_DESC: [newestFirst(spells.createdAt)],
  TITLE_ASC: [
    { expression: sql`(${spells.title} is null)`, type: 'boolean' },
    { expression: sql`coalesce(${spells.title}, '')`, type: 'text' },
  ],
};

/**
 * One page of the coven's grimoire this member may read — its shared spells
 * and the reader's own private ones — in the asked-for order, through the
 * cursor helper (rule 8). The status, when given, filters in SQL (rule 7).
 */
export function findGrimoirePage(
  membership: Membership,
  page: PageRequest,
  query: GrimoireQuery,
): Promise<PageEntry<typeof spells.$inferSelect>[]> {
  return findPageInReadableSpells(
    membership,
    spells,
    GRIMOIRE_ORDER[query.order],
    page,
    query.status === undefined ? undefined : eq(spells.status, query.status),
  );
}
