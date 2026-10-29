import 'server-only';
import { findStockOfIngredients } from '../../../db/repository';
import type { Session } from '../../../lib/session';
import type { IngredientRow, LastEdit } from '../types';
import { assertMembership } from '@/modules/coven';
import { displayNamesOf } from '@/modules/identity';

// The "last edited by" of a coven's Ingredients cards. The editor shown is the stock
// row's, never the compendium entry's, whose editor is an admin and no business of the
// coven's.

/** An entry of the coven's list: the row, whose own stamp counts only where the coven owns it. */
type LastEditEntry = Pick<IngredientRow, 'id' | 'workspaceId' | 'updatedBy' | 'updatedAt'>;

/**
 * The latest edit to each entry in the coven, one answer per entry in the order given: the
 * newest of the coven's live jars of it and, for the coven's own entry, the entry's row. A
 * compendium entry counts its jars alone, so one with no jar answers null. The editors' names
 * come from `displayNamesOf` in one batch for the whole list, whatever its length.
 *
 * Jars are read as `stockOf` reads them (the coven's, live, of a form the coven may read), in
 * one query for every entry; the newest is picked from them, which is not a second filter.
 *
 * @throws {Forbidden} the caller may not read this coven's stock.
 */
export async function lastEditsOf(
  session: Session,
  workspaceId: string,
  entries: readonly LastEditEntry[],
): Promise<(LastEdit | null)[]> {
  const membership = await assertMembership(session, workspaceId, { inventory: ['read'] });
  const jars = await findStockOfIngredients(
    membership,
    entries.map(({ id }) => id),
  );
  const edits = entries.map((entry) => {
    const stamps = jars
      .filter((jar) => jar.ingredientId === entry.id)
      .map(({ updatedBy, updatedAt }) => ({ updatedBy, updatedAt }));
    if (entry.workspaceId === workspaceId) stamps.push(entry);
    return stamps.reduce<(typeof stamps)[number] | null>(
      (latest, stamp) => (latest && latest.updatedAt >= stamp.updatedAt ? latest : stamp),
      null,
    );
  });
  const names = await displayNamesOf(
    session,
    edits.flatMap((edit) => (edit ? [edit.updatedBy] : [])),
  );
  let next = 0;
  return edits.map((edit) =>
    edit ? { by: names[next++] ?? null, at: edit.updatedAt.toISOString() } : null,
  );
}
