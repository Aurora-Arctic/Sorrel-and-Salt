import 'server-only';
import { correspondences, type Row } from '@/components/IngredientEntry/blocks';
import type { Session } from '@/lib/session';
import { spellCorrespondencesOf } from '@/modules/grimoire';

// The recipe page's Correspondences rows: the grimoire service's combined values for the spell, shaped
// by the ingredient page's own row builder. Per request, never cached (rule 6).

const plain = (sourced: readonly { value: string }[]): string[] =>
  sourced.map(({ value }) => value);

export async function readRecipeCorrespondencesOf(
  session: Session,
  workspaceId: string,
  spellId: string,
): Promise<Row[]> {
  const found = await spellCorrespondencesOf(session, workspaceId, spellId);
  return correspondences(
    {
      elements: plain(found.elements),
      celestialBodies: plain(found.celestialBodies),
      zodiacSigns: plain(found.zodiacSigns),
      colors: plain(found.colors),
    },
    found.deities.map(({ value }) => value),
  );
}
