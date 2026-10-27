import { defineSignedInLoader } from '../../../graphql/loaders/define-loader';
import type { Built } from '../../../graphql/loaders/types';
import { assignedCategoriesOf, derivedCategoriesOf, stepsOfSpells } from '../services/spell-reads';
import type { CategoryRow } from '@/modules/vocabulary';
import type { SpellKey, SpellStepView } from '../types';

// A spell's fields, batched: every spell a grimoire page lists, read together
// per coven rather than once per spell (CLAUDE.md rule 9). Keyed by the spell
// and its coven, so the service checks the coven without a read of its own;
// cached by id, since a spell id names one spell in one coven.
const byId = { cacheKeyFn: (ref: SpellKey) => ref.id };

/** Each spell's live steps in recipe order, for `Spell.steps`. */
export const stepsBySpell = defineSignedInLoader<SpellKey, SpellStepView[], string>(
  stepsOfSpells,
  byId,
);

/** The categories each spell's author assigned it, for `Spell.categories` and its gaps. */
export const assignedCategoriesBySpell = defineSignedInLoader<SpellKey, CategoryRow[], string>(
  assignedCategoriesOf,
  byId,
);

/** The categories each spell's ingredients carry, for `Spell.derivedCategories` and its gaps. */
export const derivedCategoriesBySpell = defineSignedInLoader<SpellKey, CategoryRow[], string>(
  derivedCategoriesOf,
  byId,
);

/**
 * Drops the request's cached steps and categories of the spell a save
 * answered, so a later read in the same request sees the save.
 */
export function clearSpell(
  loaders: Built<{
    stepsBySpell: typeof stepsBySpell;
    assignedCategoriesBySpell: typeof assignedCategoriesBySpell;
    derivedCategoriesBySpell: typeof derivedCategoriesBySpell;
  }>,
  spell: SpellKey,
): void {
  const key = { id: spell.id, workspaceId: spell.workspaceId };
  loaders.stepsBySpell.clear(key);
  loaders.assignedCategoriesBySpell.clear(key);
  loaders.derivedCategoriesBySpell.clear(key);
}
