'use client';

import { type ReactElement, useId } from 'react';
import {
  type FieldError as FormFieldError,
  get,
  useController,
  useFormContext,
  useFormState,
} from 'react-hook-form';
import CategoryPicker from '../CategoryPicker';
import { FieldError } from '../Field';
import { useCategoryIndex } from './category-index';
import type { SpellBuilderValues } from './types';

// The categories a spell is assigned (what it intends), picked from every live category as chips in
// their group's colour; never those its ingredients bring (claude-docs/components/spell-builder.md,
// "The fields"). The same picker as ../IngredientForm/categories.tsx.

/** Whether two lists of category ids hold the same categories, in any order, a repeat once. */
export function sameCategories(
  one: readonly string[] | undefined,
  other: readonly (string | undefined)[] | undefined,
): boolean {
  const a = new Set(one ?? []);
  const b = new Set(other ?? []);
  return a.size === b.size && [...a].every((id) => b.has(id));
}

/** The Categories field, on the builder's `categoryIds`. */
export function SpellCategoriesField(): ReactElement {
  const { control } = useFormContext<SpellBuilderValues>();
  const { field } = useController({ control, name: 'categoryIds' });
  const { errors } = useFormState({ control, name: 'categoryIds' });
  const errorId = `${useId()}-error`;
  const { categories, names, isPending, isError } = useCategoryIndex();
  const named = (id: string) => names.get(id) ?? id;
  const picked: string[] = field.value;

  // An issue on one pick is pathed to its index, as the ids were sent, and
  // names the pick; one on the field is the field's.
  const issue = get<unknown, FormFieldError | undefined>(errors, 'categoryIds');
  const entryIssues: { id: string; message: string }[] = Array.isArray(issue)
    ? issue.flatMap((entry, index) =>
        entry?.message && picked[index] !== undefined
          ? [{ id: picked[index], message: entry.message as string }]
          : [],
      )
    : [];
  const message = [
    ...entryIssues.map(({ id, message: said }) => `${named(id)}: ${said}`),
    Array.isArray(issue) ? undefined : (issue?.message as string | undefined),
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <CategoryPicker
      legend="Categories"
      entry="Category"
      placeholder="Add a category"
      categories={categories}
      pending={isPending}
      value={picked}
      onChange={field.onChange}
      invalid={entryIssues.map(({ id }) => id)}
      errorId={message ? errorId : undefined}
      error={<FieldError id={errorId} message={message} />}
      status={isError ? 'The categories could not be loaded.' : undefined}
      // The name an undo finds the box by, to put focus back on it.
      boxName="categoryIds"
    />
  );
}
