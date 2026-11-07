import type { CategoryComparison } from './types';

// Takes id sets only and returns the two lists apart (claude-docs/db/grimoire.md, "Grimoire service and schema details").
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
