import 'server-only';
import type { Route } from 'next';
import { readCategories } from '@/app/compendium-reads';
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
  /** The service's step views the steps were made from, which the page's side column reads further. */
  views: SpellStepView[];
  categories: CardCategory[];
  lastEdit: { by: string | null; at: string };
}

export async function readRecipeOf(
  session: Session,
  spell: Awaited<ReturnType<typeof readSpell>>,
  /** Where the recipe is drawn, which its steps' Quick Look eyes add `entry=` to. */
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
  const byId = new Map(known.map((category) => [category.id, category]));
  return {
    steps: recipeStepsOf(steps ?? [], hereHref),
    views: steps ?? [],
    categories: (assigned ?? []).flatMap(({ id }): CardCategory[] => {
      const category = byId.get(id);
      return category ? [{ category: { id, name: category.name }, group: category.group }] : [];
    }),
    lastEdit: { by: editor ?? null, at: spell.updatedAt.toISOString() },
  };
}
