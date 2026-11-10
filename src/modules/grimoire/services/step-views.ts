import 'server-only';
import {
  findCupboardEntriesOf,
  findFormsInSpellsIncludingSoftDeleted,
  findIngredientsInSpellsIncludingSoftDeleted,
  findManyInSpells,
} from '../../../db/repository';
import { spellSteps } from '../schema/spell-steps';
import type { Membership } from '@/modules/coven';
import { applyCupboardEntry } from '@/modules/ingredients';
import type { SpellStepView } from '../types';

/** The distinct ingredients a spell's steps link to; an instruction-only step links to none. */
export function linkedIngredientIds(steps: readonly { ingredientId: string | null }[]): string[] {
  return [
    ...new Set(steps.flatMap((step) => (step.ingredientId === null ? [] : [step.ingredientId]))),
  ];
}

/**
 * Deleted ingredients and forms are kept and marked `deleted` (claude-docs/db/grimoire.md, "Grimoire read details").
 */
export async function stepsInSpells(
  membership: Membership,
  spellIds: readonly string[],
): Promise<(spellId: string) => SpellStepView[]> {
  const rows = await findManyInSpells(membership, spellSteps, spellIds);
  const linked = linkedIngredientIds(rows);
  const [held, forms, cupboard] = await Promise.all([
    findIngredientsInSpellsIncludingSoftDeleted(membership, linked),
    findFormsInSpellsIncludingSoftDeleted(membership, linked),
    findCupboardEntriesOf(membership, linked),
  ]);
  // A compendium entry reads as this coven's cupboard has it, its label standing over the compendium's name.
  const entryById = new Map(cupboard.map((entry) => [entry.ingredientId, entry]));
  const ingredientById = new Map(
    held.map((row) => [row.id, applyCupboardEntry(row, entryById.get(row.id))]),
  );
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
        variant:
          form && ingredient
            ? { ...form, workspaceId: ingredient.workspaceId, deleted: form.deletedAt !== null }
            : null,
      };
    });

  return (spellId) => steps.filter((step) => step.spellId === spellId);
}
