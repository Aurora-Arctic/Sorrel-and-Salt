import 'server-only';
import type { Route } from 'next';
import { readCategories } from '@/app/compendium-reads';
import { cardCategoryReader } from '@/components/CategoryChips/card-categories';
import type { CardCategory } from '@/components/IngredientCard/types';
import type { RecipeStep } from '@/components/SpellRecipe/types';
import type { Session } from '@/lib/session';
import { assignedCategoriesOf, stepsOfSpells } from '@/modules/grimoire';
import type { readSpell, SpellStepView } from '@/modules/grimoire';
import { displayNamesOf } from '@/modules/identity';
import { recipeStepsOf } from './[id]/recipe-steps';

// What the recipe body needs beyond the spell row: its steps, its assigned categories and the name
// of whoever last edited it. One function for the recipe page and the list's Quick Look modal, so
// the two read the same things. Read per request and never cached (rule 6).

export interface RecipeRead {
  steps: RecipeStep[];
  views: SpellStepView[];
  categories: CardCategory[];
  lastEdit: { by: string | null; at: string };
}

export async function readRecipeOf(
  session: Session,
  spell: Awaited<ReturnType<typeof readSpell>>,
  hereHref: Route,
): Promise<RecipeRead> {
  const ref = [{ id: spell.id, workspaceId: spell.workspaceId }];
  const [[steps], [assigned], known, [editor]] = await Promise.all([
    stepsOfSpells(session, ref),
    assignedCategoriesOf(session, ref),
    readCategories(),
    displayNamesOf(session, [spell.updatedBy]),
  ]);
  if (steps instanceof Error || assigned instanceof Error)
    throw steps instanceof Error ? steps : assigned;
  return {
    steps: recipeStepsOf(steps ?? [], hereHref),
    views: steps ?? [],
    categories: cardCategoryReader(known)(assigned ?? []),
    lastEdit: { by: editor ?? null, at: spell.updatedAt.toISOString() },
  };
}
