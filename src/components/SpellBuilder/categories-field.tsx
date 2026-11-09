'use client';

import type { ReactElement } from 'react';
import { CategoriesField } from '../CategoryPicker/field';

// The categories a spell is assigned (what it intends), picked from every live category as chips in
// their group's colour; never those its ingredients bring (claude-docs/components/spell-builder.md,
// "The fields").

export function sameCategories(
  one: readonly string[] | undefined,
  other: readonly (string | undefined)[] | undefined,
): boolean {
  const a = new Set(one ?? []);
  const b = new Set(other ?? []);
  return a.size === b.size && [...a].every((id) => b.has(id));
}

export function SpellCategoriesField(): ReactElement {
  return <CategoriesField name="categoryIds" boxName="categoryIds" />;
}
