import type { CategoryComparison } from './types';

// Sets a spell's assigned categories (what the author intends) beside the
// categories its ingredients carry (what it is composed of) and names the gap
// in each direction (DESIGN.md §5, "Two kinds of spell category"). The two
// lists answer different questions, "tagged for prosperity but nothing in the
// jar carries it" against "mugwort adds psychic work, intended?", so they are
// returned apart and never merged into one list of differences.
//
// It takes category id sets and nothing else, rather than the steps. The
// derived side comes from `summarizeSpellCategories`, which reads the linked
// ingredients' categories only, so no quantity or unit reaches this function
// and no `unitConvert` refusal can. Pure, so no database access. Each list is
// deduped and keeps the order its side was given in.
export function compareSpellCategories(
  intended: readonly string[],
  present: readonly string[],
): CategoryComparison {
  const presentSet = new Set(present);
  const intendedSet = new Set(intended);
  return {
    intendedNotPresent: [...intendedSet].filter((id) => !presentSet.has(id)),
    presentNotIntended: [...presentSet].filter((id) => !intendedSet.has(id)),
  };
}
