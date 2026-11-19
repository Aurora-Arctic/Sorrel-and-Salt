import 'server-only';
import {
  findDeitiesOfSpellIngredientsIncludingSoftDeleted,
  findOneSpell,
  type IngredientDeityLink,
} from '../../../db/repository';
import { NotFound } from '../../../lib/errors';
import type { Session } from '../../../lib/session';
import { assertMembership } from '@/modules/coven';
import { deityDetailsOf, type DeityDetail } from '@/modules/ingredients';
import { combineCorrespondences } from '../validation/correspondences';
import { stepLabelOf } from '../validation/step-label';
import { NO_SUCH_SPELL } from './spell-not-found';
import { linkedIngredientIds, stepsInSpells } from './step-views';
import type { CorrespondenceStep, SpellCorrespondences } from '../types';

/** `deityDetailsOf` returns one detail per row, in row order, so a row and its detail share an index. */
function deitiesGroupedByIngredient(
  rows: readonly IngredientDeityLink[],
  details: readonly DeityDetail[],
): Map<string, CorrespondenceStep['deities'][number][]> {
  const grouped = new Map<string, CorrespondenceStep['deities'][number][]>();
  rows.forEach(({ row, joined }, i) => {
    const held = grouped.get(row.ingredientId) ?? [];
    held.push({ deityId: joined?.id ?? null, detail: details[i] });
    grouped.set(row.ingredientId, held);
  });
  return grouped;
}

/**
 * Every list value and deity of the spell's step ingredients, deleted ones included, each once beside the steps that gave it.
 *
 * @throws {Forbidden} the caller is not a member of this coven.
 * @throws {NotFound} no such spell here, or none this caller may read.
 */
export async function spellCorrespondencesOf(
  session: Session,
  workspaceId: string,
  spellId: string,
): Promise<SpellCorrespondences> {
  const membership = await assertMembership(session, workspaceId, { spell: ['read'] });
  if (!(await findOneSpell(membership, spellId))) throw new NotFound(NO_SUCH_SPELL);

  const steps = (await stepsInSpells(membership, [spellId]))(spellId);
  const rows = (
    await findDeitiesOfSpellIngredientsIncludingSoftDeleted(membership, linkedIngredientIds(steps))
  ).sort((a, b) => a.row.position - b.row.position);
  const details = await deityDetailsOf(
    rows.map(({ row, joined }) => ({ name: row.name, deity: joined })),
  );
  const deitiesByIngredient = deitiesGroupedByIngredient(rows, details);

  const given = steps.flatMap(({ ingredient, variant }): CorrespondenceStep[] => {
    if (!ingredient) return [];
    return [
      {
        label: stepLabelOf(ingredient.name, variant?.form ?? null),
        lists: variant ? [ingredient, variant] : [ingredient],
        deities: deitiesByIngredient.get(ingredient.id) ?? [],
      },
    ];
  });
  return combineCorrespondences(given);
}
