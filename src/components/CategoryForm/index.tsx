'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { ClientError } from 'graphql-request';
import { type ReactElement, useId, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { graphql } from '../../gql';
import { graphqlRequest } from '../../lib/graphql-client';
import type { ValidationIssue } from '../../lib/types';
import { ComboboxSelect } from '../Combobox';
import { CategoryInput } from '@/modules/vocabulary/validation/category';
import type { CategoryFormProps, CategoryFormValues } from './types';
import './index.scss';

// The admin's category form (M5.6): a name, a description and the group it
// is filed under, validated by the shared schema before the mutation and
// again by the service, and on an existing category a delete behind a
// confirmation. It holds no modal of its own; the page puts it in one
// (claude-docs/components/category-form.md).

const CreateCategoryDocument = graphql(`
  mutation CreateCategory($input: CategoryInput!) {
    createCategory(input: $input) {
      id
      slug
    }
  }
`);

const UpdateCategoryDocument = graphql(`
  mutation UpdateCategory($id: ID!, $input: CategoryInput!) {
    updateCategory(id: $id, input: $input) {
      id
      slug
    }
  }
`);

const DeleteCategoryDocument = graphql(`
  mutation DeleteCategory($id: ID!) {
    deleteCategory(id: $id)
  }
`);

const GENERIC_ERROR = "That didn't work. Please try again.";

const FIELDS = ['name', 'description', 'groupId'] as const;
type FieldName = (typeof FIELDS)[number];

const EMPTY: CategoryFormValues = { name: '', description: '', groupId: '' };

/** A failed request as issues pathed to the input: a VALIDATION error's field errors, or one sentence. */
function issuesOf(error: unknown): ValidationIssue[] {
  if (!(error instanceof ClientError)) return [{ path: [], message: GENERIC_ERROR }];
  const [first] = error.response.errors ?? [];
  const extensions = first?.extensions as
    { code?: string; fieldErrors?: ValidationIssue[] } | undefined;
  if (extensions?.code === 'VALIDATION' && extensions.fieldErrors?.length) {
    return extensions.fieldErrors;
  }
  return [{ path: [], message: first?.message || GENERIC_ERROR }];
}

const isField = (key: unknown): key is FieldName => FIELDS.includes(key as FieldName);

/**
 * The asterisk beside a required field's label, for the eye: hidden from the
 * field's name, so a screen reader hears the label and the control's
 * `aria-required` rather than "star", as IngredientForm's is.
 */
const Required = (): ReactElement => (
  <span className="category-form__required" aria-hidden="true">
    *
  </span>
);

const CategoryForm = ({ category, groups, onDone }: CategoryFormProps): ReactElement => {
  const id = useId();
  const ids = (field: string) => ({ control: `${id}-${field}`, error: `${id}-${field}-error` });
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<CategoryFormValues>({
    defaultValues: category
      ? { name: category.name, description: category.description, groupId: category.groupId }
      : EMPTY,
    resolver: zodResolver(CategoryInput),
  });
  const [confirming, setConfirming] = useState(false);
  const [alert, setAlert] = useState<string>();

  const save = useMutation({
    mutationFn: async (input: CategoryFormValues): Promise<void> => {
      if (category) await graphqlRequest(UpdateCategoryDocument, { id: category.id, input });
      else await graphqlRequest(CreateCategoryDocument, { input });
    },
  });

  const remove = useMutation({
    mutationFn: (categoryId: string) => graphqlRequest(DeleteCategoryDocument, { id: categoryId }),
  });

  const submit = async (input: CategoryFormValues): Promise<void> => {
    setAlert(undefined);
    try {
      await save.mutateAsync(input);
      onDone();
    } catch (error) {
      // Beside the field it names; anything else above the fields.
      const unplaced: string[] = [];
      for (const { path, message } of issuesOf(error)) {
        const [field, ...rest] = path;
        if (rest.length === 0 && isField(field)) setError(field, { type: 'server', message });
        else unplaced.push(message);
      }
      if (unplaced.length > 0) setError('root', { type: 'server', message: unplaced.join(' ') });
    }
  };

  const confirmDelete = async (): Promise<void> => {
    if (!category) return;
    setAlert(undefined);
    try {
      await remove.mutateAsync(category.id);
      onDone();
    } catch (error) {
      // Not a bad value in a box: a refusal naming its remedy (DESIGN.md §7).
      setConfirming(false);
      setAlert(issuesOf(error)[0]?.message ?? GENERIC_ERROR);
    }
  };

  const fieldAria = (field: FieldName) => ({
    'aria-invalid': errors[field] ? true : undefined,
    'aria-describedby': errors[field] ? ids(field).error : undefined,
  });
  const fieldError = (field: FieldName) =>
    errors[field]?.message && (
      <p id={ids(field).error} className="field__error">
        {errors[field]?.message}
      </p>
    );
  const choices = groups.map((group) => ({ value: group.id, label: group.name }));
  const rootError = errors.root?.message ?? alert;

  return (
    <form className="form category-form" onSubmit={handleSubmit(submit)} noValidate>
      {rootError && (
        <p className="notice notice--error" role="alert">
          {rootError}
        </p>
      )}
      <div className="field">
        <label className="field__label" htmlFor={ids('name').control}>
          Name
          <Required />
        </label>
        <input
          id={ids('name').control}
          className="input"
          aria-required
          {...fieldAria('name')}
          {...register('name')}
        />
        {fieldError('name')}
      </div>
      <div className="field">
        <label className="field__label" htmlFor={ids('description').control}>
          Description
          <Required />
        </label>
        <textarea
          id={ids('description').control}
          className="textarea"
          rows={3}
          aria-required
          {...fieldAria('description')}
          {...register('description')}
        />
        {fieldError('description')}
      </div>
      <div className="field">
        <label className="field__label" id={`${id}-group-label`} htmlFor={ids('groupId').control}>
          Group
          <Required />
        </label>
        <Controller
          control={control}
          name="groupId"
          render={({ field }) => (
            <ComboboxSelect
              id={ids('groupId').control}
              label="Group"
              labelId={`${id}-group-label`}
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              choices={choices}
              placeholder="Choose a group"
              required
              inputRef={field.ref}
              {...fieldAria('groupId')}
            />
          )}
        />
        {fieldError('groupId')}
      </div>
      {confirming ? (
        <div className="category-form__confirm">
          <p>
            Delete &quot;{category?.name}&quot;? Covens&apos; ingredients and spells filed under it
            lose it too.
          </p>
          <div className="modal__actions">
            <button
              type="button"
              className="btn btn--destructive"
              disabled={remove.isPending}
              aria-busy={remove.isPending || undefined}
              onClick={() => void confirmDelete()}
            >
              {remove.isPending && <span className="spinner" aria-hidden="true" />}
              {remove.isPending ? 'Deleting' : 'Delete'}
            </button>
            <button type="button" className="btn btn--quiet" onClick={() => setConfirming(false)}>
              Keep It
            </button>
          </div>
        </div>
      ) : (
        <div className="modal__actions category-form__actions">
          {/* Offered only when there is something to save — nothing typed on a
              new category, nothing changed on an existing one — the owner's
              rule for every form; and busy, saying so, from the press to the
              answer. */}
          <button
            type="submit"
            className="btn btn--solid"
            disabled={!isDirty || isSubmitting}
            aria-busy={isSubmitting || undefined}
          >
            {isSubmitting && <span className="spinner" aria-hidden="true" />}
            {isSubmitting ? 'Saving Category' : 'Save Category'}
          </button>
          <button type="button" className="btn btn--quiet" onClick={onDone}>
            Cancel
          </button>
          {category && (
            <button
              type="button"
              className="btn btn--destructive category-form__delete"
              onClick={() => {
                setAlert(undefined);
                setConfirming(true);
              }}
            >
              Delete Category
            </button>
          )}
        </div>
      )}
    </form>
  );
};

export default CategoryForm;
