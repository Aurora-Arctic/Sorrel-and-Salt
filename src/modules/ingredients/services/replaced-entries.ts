import 'server-only';
import { findCompendiumMatchesByName } from '../../../db/repository';
import type { Session } from '../../../lib/session';
import { assertMembership } from '@/modules/coven';
import type { CompendiumMatches, IngredientRow } from '../types';

/** How many matches the entry page links by name; the rest sit behind "See All". */
const MATCHES_SHOWN = 3;

/**
 * The compendium entries an own entry of a coven is, or may be, for the entry
 * page to link: the first few by name, and how many there are in all.
 *
 * - An own entry with a formal name is matched on that name: `same` entries are
 *   those sharing its identity, and a compendium entry that merely shares the
 *   label is not one.
 * - An own entry with no formal name is matched on its label, exactly but for
 *   case: `similar` entries, listed for the member to read. Nothing converts the
 *   own entry into one (v1 links one way, DESIGN.md §13).
 * - A compendium entry has none, without a database read.
 *
 * The session is checked against the entry's own coven, with the permission
 * `getIngredient` asks, so a viewer reads it and a non-member is refused.
 *
 * @throws {Forbidden} the session holds no seat in the entry's coven.
 */
export async function compendiumMatchesOf(
  session: Session,
  entry: IngredientRow,
): Promise<CompendiumMatches> {
  const none: CompendiumMatches = { kind: 'none', entries: [], total: 0 };
  if (entry.workspaceId === null) return none;
  await assertMembership(session, entry.workspaceId, { ingredient: ['read'] });
  const named = entry.canonicalName !== null && entry.canonicalName.trim() !== '';
  const found = await findCompendiumMatchesByName(named ? entry.canonicalName! : entry.name);
  const matches = (
    named ? found.filter((row) => row.identityKey === entry.identityKey) : found
  ).sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
  return {
    kind: named ? 'same' : 'similar',
    entries: matches
      .slice(0, MATCHES_SHOWN)
      .map(({ id, slug, name, canonicalName }) => ({ id, slug, name, canonicalName })),
    total: matches.length,
  };
}
