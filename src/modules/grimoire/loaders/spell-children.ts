import { defineSignedInLoader } from '../../../graphql/loaders/define-loader';
import type { Built } from '../../../graphql/loaders/types';
import { assignedCategoriesOf, derivedCategoriesOf, stepsOfSpells } from '../services/spell-reads';
import { workingCountsOf } from '../services/workings';
import type { CategoryRow } from '@/modules/vocabulary';
import type { SpellKey, SpellStepView } from '../types';

// A spell's fields, batched per coven rather than once per spell (CLAUDE.md rule 9).
// Keyed by the spell and its coven, so the service checks the coven without a read
// of its own; cached by id, since a spell id names one spell in one coven.
const byId = { cacheKeyFn: (ref: SpellKey) => ref.id };

export const stepsBySpell = defineSignedInLoader<SpellKey, SpellStepView[], string>(
  stepsOfSpells,
  byId,
);

export const assignedCategoriesBySpell = defineSignedInLoader<SpellKey, CategoryRow[], string>(
  assignedCategoriesOf,
  byId,
);

export const derivedCategoriesBySpell = defineSignedInLoader<SpellKey, CategoryRow[], string>(
  derivedCategoriesOf,
  byId,
);

/** So a later read in the same request sees the save. */
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

/** A spell with none counts 0. */
export const workingCountBySpell = defineSignedInLoader<SpellKey, number, string>(
  workingCountsOf,
  byId,
);

export function clearWorkingCount(
  loaders: Built<{ workingCountBySpell: typeof workingCountBySpell }>,
  spell: SpellKey,
): void {
  loaders.workingCountBySpell.clear({ id: spell.id, workspaceId: spell.workspaceId });
}
