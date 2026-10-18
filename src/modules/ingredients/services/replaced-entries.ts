import 'server-only';
import { findCompendiumEntriesHiddenBy } from '../../../db/repository';
import type { Session } from '../../../lib/session';
import { assertMembership } from '@/modules/coven';
import type { IngredientRow, ReplacedCompendiumEntries } from '../types';

/** How many hidden entries the entry page links by name; the rest sit behind "See All". */
const REPLACED_ENTRIES_SHOWN = 3;

/**
 * The compendium entries a coven's own entry hides, for the entry page to link
 * (M12.12): the first few by name, and how many it hides in all. The same
 * match that drops a hidden entry from a coven's lists, read from the local
 * side, so the link and the suppression cannot disagree. Ordering, the limit
 * and the total are all the database's. A compendium entry replaces nothing
 * and answers with none, without a database read. The session is checked
 * against the entry's own coven rather than trusted from the page, with the
 * permission `getIngredient` asks, so a viewer reads it and a non-member is
 * refused.
 *
 * @throws {Forbidden} the session holds no seat in the entry's coven.
 */
export async function compendiumEntriesReplacedBy(
  session: Session,
  entry: IngredientRow,
): Promise<ReplacedCompendiumEntries> {
  if (entry.workspaceId === null) return { entries: [], total: 0 };
  const membership = await assertMembership(session, entry.workspaceId, { ingredient: ['read'] });
  return findCompendiumEntriesHiddenBy(membership, entry.id, REPLACED_ENTRIES_SHOWN);
}
