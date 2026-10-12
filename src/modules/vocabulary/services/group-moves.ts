import 'server-only';
import { findOneBySlug } from '../../../db/repository';
import { ValidationError } from '../../../lib/errors';
import { violatedUniqueIndex } from '../../../lib/unique-violation';
import type { GroupMove, MovedRows } from '../types';

// What a group's rename or delete does to the rows filed under it when their
// slug carries the group's name: a form's (M5.6a) and a deity's (MB.132). Each
// row moves to the slug its name and the group's new name give it, and a move
// onto another live row's address is refused, naming both. `curated-writes.ts`'s
// `updateGroup` and `deleteGroup` call it for every group; internal to the
// module.

/**
 * How a write refuses a moved row's collision: on which field, and the words
 * that lead into the address — the rename's, or the delete's.
 */
export function refusal(rows: MovedRows, path: string[], lead: (row: GroupMove['row']) => string) {
  return (row: GroupMove['row'], slug: string, holder: string | undefined): never => {
    const held = holder
      ? `"${holder}" already has — rename one of them first`
      : `another ${rows.noun} already has — try again`;
    throw new ValidationError([
      { path, message: `${lead(row)} the address "${slug}", which ${held}` },
    ]);
  };
}

/**
 * Refuses a move that would put a row on another live row's address, naming
 * both. Read before the write, and again after one the slug index refused,
 * since two admins can race: then `error` is that write's, and anything but
 * that collision passes through untouched. A collision the second read cannot
 * place is refused in general terms.
 */
export async function refuseCollidingMoves(
  rows: MovedRows,
  moves: readonly GroupMove[],
  refuse: ReturnType<typeof refusal>,
  error?: unknown,
): Promise<void> {
  if (error !== undefined && violatedUniqueIndex(error) !== rows.slugIndex) return;
  for (const { row, slug } of moves) {
    if (slug === row.slug) continue;
    const holder = await findOneBySlug(rows.table, slug);
    if (holder && holder.id !== row.id) refuse(row, slug, holder.name);
  }
  const [first] = moves;
  if (error !== undefined && first) refuse(first.row, first.slug, undefined);
}
