import type { StepCategories } from './types';

// Gathers the categories a spell is made of: the union of the categories of
// the ingredients its steps link (DESIGN.md §5, "Two kinds of spell
// category"). This is the derived side only; the categories the author
// assigned as intent are a different set and never enter here.
//
// A pure function over rows the caller already loaded, rather than a query,
// so it runs the same in the builder as on the server and touches no database.
// A step with no `ingredientId` is skipped even if it carries category ids: an
// instruction-only step has no ingredient, and a custom one-off ingredient
// is never an `ingredients` row, so it contributes nothing.
// Order is first seen, so the result does not shuffle between renders.
export function summarizeSpellCategories(steps: readonly StepCategories[]): string[] {
  const seen = new Set<string>();
  for (const step of steps) {
    if (step.ingredientId === null) continue;
    for (const categoryId of step.categoryIds) seen.add(categoryId);
  }
  return [...seen];
}
