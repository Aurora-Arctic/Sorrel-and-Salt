import 'server-only';
import {
  findFormsInSpellsIncludingSoftDeleted,
  findIngredientsInSpellsIncludingSoftDeleted,
  findManyInSpells,
} from '../../../db/repository';
import { spellSteps } from '../schema/spell-steps';
import type { Membership } from '@/modules/coven';
import type { SpellStepView } from '../types';

/**
 * The live steps of each readable spell named, in recipe order, each with its
 * ingredient and the form it lays: what `stepsOfSpells`, `Spell.steps`'
 * batch, answers (M10.9). Internal to the module, so not exported from its
 * index.
 *
 * A linked ingredient is read through the finder that keeps a deleted one,
 * and its forms through the one that keeps deleted forms, each marked
 * `deleted`: a spell records a working, so what went into the jar stays in
 * it, whether the ingredient or only its form was deleted since (M5.3, M10.9). A link to another coven's ingredient reads `null`, as
 * the finder withholds it. Four statements whatever the number of spells: the
 * steps, the ingredients, and the forms, which read their parents again.
 *
 * Order is `position`, falling back to `layer_order` until M13.9 drops it.
 */
export async function stepsInSpells(
  membership: Membership,
  spellIds: readonly string[],
): Promise<(spellId: string) => SpellStepView[]> {
  const rows = await findManyInSpells(membership, spellSteps, spellIds);
  const linked = [
    ...new Set(rows.flatMap((step) => (step.ingredientId === null ? [] : [step.ingredientId]))),
  ];
  const [held, forms] = await Promise.all([
    findIngredientsInSpellsIncludingSoftDeleted(membership, linked),
    findFormsInSpellsIncludingSoftDeleted(membership, linked),
  ]);
  const ingredientById = new Map(held.map((row) => [row.id, row]));
  const formById = new Map(forms.map((row) => [row.id, row]));

  const steps = rows
    .sort((a, b) => (a.position ?? a.layerOrder) - (b.position ?? b.layerOrder))
    .map((step): SpellStepView => {
      const ingredient =
        step.ingredientId === null ? undefined : ingredientById.get(step.ingredientId);
      const form = step.variantId === null ? undefined : formById.get(step.variantId);
      return {
        ...step,
        ingredient: ingredient ? { ...ingredient, deleted: ingredient.deletedAt !== null } : null,
        // A form carries its ingredient's tier, which the GraphQL type reads (MB.215).
        variant:
          form && ingredient
            ? { ...form, workspaceId: ingredient.workspaceId, deleted: form.deletedAt !== null }
            : null,
      };
    });

  return (spellId) => steps.filter((step) => step.spellId === spellId);
}
