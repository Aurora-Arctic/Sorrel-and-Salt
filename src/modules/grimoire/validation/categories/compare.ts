import type { CategoryComparison } from './types';

// Sets a spell's assigned categories (what the author intends) beside the categories its ingredients carry and names the gap
// in each direction (DESIGN.md §5, "Two kinds of spell category"). Takes id sets only, is pure, and returns the two lists apart
// (claude-docs/db/grimoire.md, "Grimoire service and schema details").
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
