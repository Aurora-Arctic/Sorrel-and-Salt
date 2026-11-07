import 'server-only';
import { findCompendiumMatchesByName } from '../../../db/repository';
import type { Session } from '../../../lib/session';
import { assertMembership } from '@/modules/coven';
import type { CompendiumMatches, IngredientRow } from '../types';

const MATCHES_SHOWN = 3;

/**
 * The compendium entries an own entry of a coven is, or may be, for the entry
 * page to link: the first few by name, and how many there are in all. `same`
 * entries share the own entry's formal name; with no formal name, `similar`
 * entries match its label but for case, listed for the member to read (v1 links
 * one way, DESIGN.md §13). A compendium entry has none, with no database read.
 * The session is checked against the entry's coven with `getIngredient`'s permission.
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
