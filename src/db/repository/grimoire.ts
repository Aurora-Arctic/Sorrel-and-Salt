import { sql } from 'drizzle-orm';
import { spells } from '../../modules/grimoire/schema/spells';
import type { Membership } from '@/modules/coven';
import type { PageEntry, PageRequest } from '../../lib/types';
import { findPageInReadableSpells } from './finders';
import type { SortPart } from './types';

// The grimoire list's read (M10.9). In a file of its own rather than in
// `spells.ts`, because `finders.ts` imports `readableSpells` from there and
// this pages through `finders.ts`: the two in one file would import each other.

/**
 * The grimoire's order, newest first, as the invitation lists' is: a page's
 * key is ascending, so the instant is written negated, and as `numeric`,
 * which keeps the microseconds a `Date` would drop from a cursor. Not by
 * title, because M13.15 makes a draft's title nullable and a sort part must
 * be NOT NULL. Spells of one instant follow by id.
 */
const GRIMOIRE_ORDER: readonly SortPart[] = [
  { expression: sql`-extract(epoch from ${spells.createdAt})`, type: 'numeric' },
];

/**
 * One page of the coven's grimoire this member may read — its shared spells
 * and the reader's own private ones, filtered in SQL (CLAUDE.md rule 7) —
 * newest first, through the cursor helper (rule 8).
 */
export function findGrimoirePage(
  membership: Membership,
  page: PageRequest,
): Promise<PageEntry<typeof spells.$inferSelect>[]> {
  return findPageInReadableSpells(membership, spells, GRIMOIRE_ORDER, page);
}
