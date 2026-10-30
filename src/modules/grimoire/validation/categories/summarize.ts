import type { StepCategories } from './types';

// Gathers the categories a spell is made of: the union of the categories of the ingredients its steps link (DESIGN.md §5,
// "Two kinds of spell category"). Pure, derived side only; skipped and ordering rules: claude-docs/db/grimoire.md, "Grimoire service and schema details".
export function summarizeSpellCategories(steps: readonly StepCategories[]): string[] {
  const seen = new Set<string>();
  for (const step of steps) {
    if (step.ingredientId === null) continue;
    for (const categoryId of step.categoryIds) seen.add(categoryId);
  }
  return [...seen];
}
