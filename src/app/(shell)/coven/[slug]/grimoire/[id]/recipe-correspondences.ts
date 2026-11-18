import 'server-only';
import { correspondences, type Row } from '@/components/IngredientEntry/blocks';
import type { Session } from '@/lib/session';
import { spellCorrespondencesOf } from '@/modules/grimoire';

// The recipe page's Correspondences rows: the grimoire service's combined values for the spell, shaped
// by the ingredient page's own row builder, each value keeping the ingredients that gave it. Per request, never cached (rule 6).
export async function readRecipeCorrespondencesOf(
  session: Session,
  workspaceId: string,
  spellId: string,
): Promise<Row[]> {
  const found = await spellCorrespondencesOf(session, workspaceId, spellId);
  return correspondences(found, found.deities);
}
