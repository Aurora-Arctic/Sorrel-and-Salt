import type { Route } from 'next';
import { UNAVAILABLE_INGREDIENT } from '@/components/RecordWorking/warnings';
import type { WorkingStep } from '@/components/RecordWorking/types';
import type { StockDialogProps } from '@/components/StockDialog/types';
import type { RecipeStep } from '@/components/SpellRecipe/types';
import { withParam } from '@/lib/list-href';
import { fold } from '@/lib/text';
import type { SpellStepView } from '@/modules/grimoire';

export const entryHrefOf = (hereHref: Route, id: string): Route => withParam(hereHref, 'entry', id);

export function recipeStepsOf(views: readonly SpellStepView[], hereHref: Route): RecipeStep[] {
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
      variantId: linked ? view.variantId : null,
      quantity: view.quantity === null ? null : String(view.quantity),
      unit: view.unit,
      look:
        ingredient && !ingredient.deleted
          ? {
              href: entryHrefOf(hereHref, ingredient.id),
              name: ingredient.name,
              canonicalName: ingredient.canonicalName,
              nomenclature: ingredient.nomenclature,
            }
          : null,
      safety: ingredient
        ? {
            toxic: ingredient.toxic,
            safetyNotes: ingredient.safetyNotes,
            variants: variant
              ? [{ form: variant.form, toxic: variant.toxic, safetyNotes: variant.safetyNotes }]
              : [],
          }
        : null,
      oneOff: !linked,
      deleted: linked && (ingredient?.deleted === true || variant?.deleted === true),
      body: view.body,
    };
  });

  // Two different ingredients with the same label in one spell are told apart by the formal name of
  // each (§5: the formal name is the identity). The same ingredient in two forms is one label and
  // needs none.
  const owners = new Map<string, Set<string>>();
  views.forEach((view, i) => {
    const step = steps[i];
    if (step?.kind !== 'ingredient') return;
    const key = fold(step.name);
    owners.set(key, (owners.get(key) ?? new Set()).add(view.ingredientId ?? `one-off:${view.id}`));
  });
  return steps.map((step, i) => {
    if (step.kind !== 'ingredient') return step;
    if ((owners.get(fold(step.name))?.size ?? 0) < 2) return step;
    return { ...step, formal: views[i]?.ingredient?.canonicalName ?? null };
  });
}

/**
 * The ingredient steps of `views` as Record a Working's preview lines read them: the form and the jar's look, and `stock` where `stocks` holds that
 * step's Edit Stock (none for a role that may not edit stock, so its jar stays a drawing).
 */
export function workingStepsOf(
  views: readonly SpellStepView[],
  hereHref: Route,
  stocks: ReadonlyMap<string, StockDialogProps | null> = new Map(),
): WorkingStep[] {
  return recipeStepsOf(views, hereHref).flatMap((step, index): WorkingStep[] => {
    if (step.kind !== 'ingredient') return [];
    const view = views[index];
    return [
      {
        id: step.id,
        name: step.name,
        form: step.form,
        seed: view?.ingredientId ?? step.name,
        oneOff: step.oneOff,
        stock: stocks.get(step.id) ?? null,
      },
    ];
  });
}
