'use client';

import { useQuery } from '@tanstack/react-query';
import { type ReactElement, useId, useMemo } from 'react';
import { get, useController, useFormContext, useFormState } from 'react-hook-form';
import { graphql } from '../../gql';
import { graphqlQuery } from '../../lib/graphql-client';
import CategoryPicker from '../CategoryPicker';
import type { PickerCategory } from '../CategoryPicker/types';
import { FieldError } from '../Field';
import type { IngredientFormValues, SharedFieldProps } from './types';

// The categories an ingredient is filed under: every live category, picked from one box, the rows
// under their groups and each pick a chip in its group's colour (claude-docs/components/
// ingredient-form.md, "The categories").

// One page of the hard maximum, MAX_PAGE_SIZE, holds every category there is (rule 8): written out,
// since the pagination module is the server's.
export const CategoriesDocument = graphql(`
  query PickerCategories {
    categories(first: 100) {
      edges {
        node {
          id
          name
          description
          group {
            id
            name
            colorDark
            colorLight
          }
        }
      }
    }
  }
`);

/**
 * The Categories field: the picker, on the form's `categoryIds`, or at
 * `at`, a variant's own, which file that form alone.
 */
export function CategoryField({ at, action }: SharedFieldProps): ReactElement {
  const FIELD = at ? (`${at}.categoryIds` as const) : 'categoryIds';
  const { control } = useFormContext<IngredientFormValues>();
  const { field } = useController({ control, name: FIELD });
  const { errors } = useFormState({ control, name: FIELD });
  const errorId = `${useId()}-error`;
  const { data, isPending, isError } = useQuery({
    ...graphqlQuery(CategoriesDocument),
    // A failed read leaves the field saying so; it never takes the form down.
    throwOnError: false,
  });
  const categories = useMemo<PickerCategory[]>(
    () => data?.categories.edges.map(({ node }) => node) ?? [],
    [data],
  );
  const picked: string[] = field.value;

  // An issue on one pick is pathed to its index, as the ids were sent; one on
  // the field is the field's.
  const named = (id: string) => categories.find((category) => category.id === id)?.name ?? id;
  const issue = get(errors, FIELD);
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
      action={action}
      boxName={at ? `${at}.drafts.categoryIds` : 'drafts.categoryIds'}
    />
  );
}
