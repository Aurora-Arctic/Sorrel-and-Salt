import 'server-only';
import { findCompendiumMatchesByName } from '../../../db/repository';
import type { Session } from '../../../lib/session';
import { assertMembership, rolePermits } from '@/modules/coven';
import type { CompendiumMatches, IngredientRow } from '../types';
import { CONVERT_PERMISSION } from './cupboard-entries';

/** How many matches the entry page links by name; the rest sit behind "See All". */
const MATCHES_SHOWN = 3;

/**
 * The compendium entries an own entry of a coven is, or may be, for the entry
 * page to link (M12.22): the first few by name, and how many there are in all.
 *
 * - An own entry with a formal name is matched on that name: `same` entries are
 *   those sharing its identity, and a compendium entry that merely shares the
 *   label is not one.
 * - An own entry with no formal name is matched on its label, exactly but for
 *   case: `similar` entries, which the member may confirm one at a time
 *   (M12.21's conversion). `canConvert` says whether this member's role may,
 *   read from the very permission the conversion checks.
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
  const none: CompendiumMatches = { kind: 'none', entries: [], total: 0, canConvert: false };
  if (entry.workspaceId === null) return none;
  const membership = await assertMembership(session, entry.workspaceId, { ingredient: ['read'] });
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
    canConvert: !named && rolePermits(membership.role, CONVERT_PERMISSION),
  };
}
