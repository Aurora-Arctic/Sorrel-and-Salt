import type { StepCategories } from './types';

// Derived side only; skipped and ordering rules: claude-docs/db/grimoire.md, "Grimoire read details".
export function summarizeSpellCategories(steps: readonly StepCategories[]): string[] {
  const seen = new Set<string>();
  for (const step of steps) {
    if (step.ingredientId === null) continue;
    for (const categoryId of step.categoryIds) seen.add(categoryId);
  }
  return [...seen];
}
