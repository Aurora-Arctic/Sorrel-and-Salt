import 'server-only';
import type { Session } from '../../../lib/session';
import { assertMembership, byCovenName, membershipsOf } from '@/modules/coven';
import type { HoldingCoven, IngredientRow } from '../types';
import { heldCompendiumEntry, isRetired } from './cupboard-entries';

/**
 * The viewer's own covens an entry's page opens in, by name: what the coven switcher asks so a
 * switch can stay on the entry (claude-docs/components/workspace-switcher.md). A live compendium
 * entry opens in every coven, held or not, since the compendium is every member's to read; a
 * retired one only in a coven whose cupboard still names it (`getIngredient` answers no other);
 * a coven's own entry in that coven alone. `entry` is the row the page already read, so this
 * costs no second read of it: one lookup of the viewer's memberships, plus, for a retired entry
 * only, one held read per coven under that coven's own `Membership` proof (the live held reads
 * skip a retired entry, which is why they cannot answer). The covens come from the viewer's
 * memberships, never from who holds the entry, so a coven they are not in is never named, and an
 * admin or curator gets only their own. Per viewer, so never cached (rule 6).
 */
export async function covensOpeningEntry(
  session: Session,
  entry: Pick<IngredientRow, 'id' | 'workspaceId' | 'deletedAt'>,
): Promise<readonly HoldingCoven[]> {
  const [memberships] = await membershipsOf(session, [session.userId]);
  if (!memberships || memberships instanceof Error) return [];
  const covens = memberships
    .map(({ workspace: { id, slug, name } }) => ({ id, slug, name }))
    .filter(({ id }) => entry.workspaceId === null || id === entry.workspaceId)
    .sort(byCovenName);
  if (!isRetired(entry)) return covens;
  const held = await Promise.all(
    covens.map(async ({ id }) =>
      heldCompendiumEntry(await assertMembership(session, id, { ingredient: ['read'] }), entry.id),
    ),
  );
  return covens.filter((_, i) => held[i] !== undefined);
}
