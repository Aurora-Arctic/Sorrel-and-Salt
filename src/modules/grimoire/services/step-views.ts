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
 * The live steps of each readable spell named, in recipe order, each with its ingredient and the form it lays.
 * Internal to the module. Deleted ingredients and forms are kept and marked `deleted` (claude-docs/db/grimoire.md, "Grimoire service and schema details").
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
    .sort((a, b) => a.position - b.position)
    .map((step): SpellStepView => {
      const ingredient =
        step.ingredientId === null ? undefined : ingredientById.get(step.ingredientId);
      const form = step.variantId === null ? undefined : formById.get(step.variantId);
      return {
        ...step,
        ingredient: ingredient ? { ...ingredient, deleted: ingredient.deletedAt !== null } : null,
        // A form carries its ingredient's tier, which the GraphQL type reads.
        variant:
          form && ingredient
            ? { ...form, workspaceId: ingredient.workspaceId, deleted: form.deletedAt !== null }
            : null,
      };
    });

  return (spellId) => steps.filter((step) => step.spellId === spellId);
}
