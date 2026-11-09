'use client';

import { type ReactElement, useId } from 'react';
import {
  type FieldError as FormFieldError,
  type FieldValues,
  get,
  useController,
  useFormContext,
  useFormState,
} from 'react-hook-form';
import { FieldError } from '../Field';
import { useCategoryIndex } from './categories';
import type { LegendAction } from './types';
import CategoryPicker from '.';

// The Categories field of a form: every live category picked from one box, each pick a chip in its
// group's colour, the per-chip errors joined with the field's own (claude-docs/components/
// ingredient-form.md, "The categories").

export function CategoriesField({
  name,
  boxName,
  action,
}: {
  /** The react-hook-form field holding the picked ids. */
  name: string;
  /** The name an undo finds the box by, to put focus back on it. */
  boxName: string;
  action?: LegendAction;
}): ReactElement {
  const { control } = useFormContext<FieldValues>();
  const { field } = useController({ control, name });
  const { errors } = useFormState({ control, name });
  const errorId = `${useId()}-error`;
  const { categories, names, isPending, isError } = useCategoryIndex();
  const picked: string[] = field.value;

  const issue = get<unknown, FormFieldError | undefined>(errors, name);
  const entryIssues: { id: string; message: string }[] = Array.isArray(issue)
    ? issue.flatMap((entry, index) =>
        entry?.message && picked[index] !== undefined
          ? [{ id: picked[index], message: entry.message as string }]
          : [],
      )
    : [];
  const message = [
    ...entryIssues.map(({ id, message: said }) => `${names.get(id) ?? id}: ${said}`),
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
      boxName={boxName}
    />
  );
}
