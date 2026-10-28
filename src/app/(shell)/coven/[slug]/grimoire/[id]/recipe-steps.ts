import type { Route } from 'next';
import type { RecipeStep } from '@/components/SpellRecipe/types';
import type { SpellStepView } from '@/modules/grimoire';

// A spell's steps as the recipe page draws them (MB.6): the service's views, already in
// recipe order, made into display values. Kept apart from the page so the rules (which
// step is an instruction, a one-off, or an ingredient since deleted, and when a formal
// name is shown) are tested on their own.

/** What a linked step reads when the service withheld its ingredient (another coven's, say). */
export const UNAVAILABLE_INGREDIENT = 'Unavailable Ingredient';

export function recipeStepsOf(views: readonly SpellStepView[], covenSlug: string): RecipeStep[] {
  const steps = views.map((view): RecipeStep => {
    const linked = view.ingredientId !== null;
    if (!linked && view.name === null) {
      return { kind: 'instruction', id: view.id, body: view.body ?? '' };
    }
    const { ingredient, variant } = view;
    const name = linked ? (ingredient?.name ?? UNAVAILABLE_INGREDIENT) : (view.name ?? '');
    const form = linked ? (variant?.form ?? null) : view.form;
    return {
      kind: 'ingredient',
      id: view.id,
      name,
      form,
      formal: null,
      quantity: view.quantity === null ? null : String(view.quantity),
      unit: view.unit,
      href:
        ingredient && !ingredient.deleted
          ? (`/coven/${covenSlug}/ingredients/${ingredient.id}` as Route)
          : null,
      oneOff: !linked,
      deleted: linked && (ingredient?.deleted === true || variant?.deleted === true),
      note: view.note,
      body: view.body,
    };
  });

  // Two different ingredients with the same label in one spell are told apart by the formal
  // name of each (§5, MB.215: the formal name is the identity). The same ingredient in two
  // forms is one label and needs none.
  const owners = new Map<string, Set<string>>();
  views.forEach((view, i) => {
    const step = steps[i];
    if (step?.kind !== 'ingredient') return;
    const key = step.name.trim().toLowerCase();
    owners.set(key, (owners.get(key) ?? new Set()).add(view.ingredientId ?? `one-off:${view.id}`));
  });
  return steps.map((step, i) => {
    if (step.kind !== 'ingredient') return step;
    if ((owners.get(step.name.trim().toLowerCase())?.size ?? 0) < 2) return step;
    return { ...step, formal: views[i]?.ingredient?.canonicalName ?? null };
  });
}
