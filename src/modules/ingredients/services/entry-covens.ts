import 'server-only';
import type { Session } from '../../../lib/session';
import { assertMembership, byCovenName, membershipsOf } from '@/modules/coven';
import type { HoldingCoven, IngredientRow } from '../types';
import { heldCompendiumEntry, isRetired } from './cupboard-entries';

/**
 * The viewer's own covens an entry's page opens in, by name, for the coven switcher. Per viewer, so never cached (rule 6).
 * Which covens: claude-docs/db/workspace-compendium-entries.md, "Entry covens".
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
