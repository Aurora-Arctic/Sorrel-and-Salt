import 'server-only';
import { readCategories } from '@/app/compendium-reads';
import type { CardCategory } from '@/components/IngredientCard/types';
import type { RecipeStep } from '@/components/SpellRecipe/types';
import type { Session } from '@/lib/session';
import { assignedCategoriesOf, stepsOfSpells } from '@/modules/grimoire';
import type { readSpell } from '@/modules/grimoire';
import { displayNamesOf } from '@/modules/identity';
import { recipeStepsOf } from './[id]/recipe-steps';

// What the recipe body needs beyond the spell row (MB.6, M13.21): its steps, its assigned
// categories and the name of whoever last edited it. One function for the recipe page and the
// list's Quick Look modal, so the two read the same things and the editor is named in one
// `displayNamesOf` call each time. Read per request and never cached (CLAUDE.md rule 6).

export interface RecipeRead {
  steps: RecipeStep[];
  categories: CardCategory[];
  lastEdit: { by: string | null; at: string };
}

export async function readRecipeOf(
  session: Session,
  spell: Awaited<ReturnType<typeof readSpell>>,
  covenSlug: string,
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
    steps: recipeStepsOf(steps ?? [], covenSlug),
    categories: (assigned ?? []).flatMap(({ id }): CardCategory[] => {
      const category = byId.get(id);
      return category ? [{ category: { id, name: category.name }, group: category.group }] : [];
    }),
    lastEdit: { by: editor ?? null, at: spell.updatedAt.toISOString() },
  };
}
