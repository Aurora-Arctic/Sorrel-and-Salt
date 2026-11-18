import 'server-only';
import {
  findDeitiesOfSpellIngredientsIncludingSoftDeleted,
  findOneSpell,
} from '../../../db/repository';
import { NotFound } from '../../../lib/errors';
import type { Session } from '../../../lib/session';
import { assertMembership } from '@/modules/coven';
import { deityDetailsOf } from '@/modules/ingredients';
import { combineCorrespondences } from '../validation/correspondences';
import { stepLabelOf } from '../validation/step-label';
import { NO_SUCH_SPELL } from './spell-not-found';
import { linkedIngredientIds, stepsInSpells } from './step-views';
import type { CorrespondenceStep, SpellCorrespondences } from '../types';

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

  const given = steps.flatMap(({ ingredient, variant }): CorrespondenceStep[] => {
    if (!ingredient) return [];
    return [
      {
        label: stepLabelOf(ingredient.name, variant?.form ?? null),
        lists: variant ? [ingredient, variant] : [ingredient],
        deities: rows.flatMap(({ row, joined }, i) =>
          row.ingredientId === ingredient.id
            ? [{ deityId: joined?.id ?? null, detail: details[i] }]
            : [],
        ),
      },
    ];
  });
  return combineCorrespondences(given);
}
