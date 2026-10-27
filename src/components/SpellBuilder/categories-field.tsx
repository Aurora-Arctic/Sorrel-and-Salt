'use client';

import { useQuery } from '@tanstack/react-query';
import { type ReactElement, useId, useMemo } from 'react';
import { get, useController, useFormContext, useFormState } from 'react-hook-form';
import { graphqlQuery } from '../../lib/graphql-client';
import CategoryPicker from '../CategoryPicker';
import type { PickerCategory } from '../CategoryPicker/types';
import { FieldError } from '../Field';
import { CategoriesDocument } from '../IngredientForm/categories';
import type { SpellBuilderValues } from './types';

// The categories a spell is assigned (M10.14, story 48): what it intends,
// picked from every live category, under their groups, each pick a chip in
// its group's colour. Never the categories its ingredients bring, which are
// read from them and shown apart (claude-docs/components/spell-builder.md,
// "Categories"). The same picker and the same query as the ingredient form's
// field (../IngredientForm/categories.tsx), on the builder's own values.

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
  const { data, isPending, isError } = useQuery({
    ...graphqlQuery(CategoriesDocument),
    // A failed read leaves the field saying so; it never takes the builder down.
    throwOnError: false,
  });
  const categories = useMemo<PickerCategory[]>(
    () => data?.categories.edges.map(({ node }) => node) ?? [],
    [data],
  );
  const picked: string[] = field.value;

  // An issue on one pick is pathed to its index, as the ids were sent, and
  // names the pick; one on the field is the field's.
  const named = (id: string) => categories.find((category) => category.id === id)?.name ?? id;
  const issue = get(errors, 'categoryIds');
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
