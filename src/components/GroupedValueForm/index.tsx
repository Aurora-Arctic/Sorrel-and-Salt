'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import type { TypedDocumentNode } from '@graphql-typed-document-node/core';
import { useMutation } from '@tanstack/react-query';
import { type ReactElement, useId, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { graphql } from '../../gql';
import { graphqlRequest } from '../../lib/graphql-client';
import { GENERIC_FAILURE, readGraphqlIssues } from '../../lib/graphql-failure';
import { ComboboxSelect } from '../Combobox';
import Notice from '../Notice';
import { CategoryInput } from '@/modules/vocabulary/validation/category';
import { DeityInput } from '@/modules/vocabulary/validation/deity';
import { IngredientFormValueInput } from '@/modules/vocabulary/validation/ingredient-form-value';
import type {
  GroupedValueFormKind,
  GroupedValueFormProps,
  GroupedValueKind,
  GroupedValueKindSpec,
  GroupedValueValues,
} from './types';
import './index.scss';

// The admin's form for a grouped curated value — a category (M5.6), an
// ingredient form (M5.6a) or a deity (MB.132) — one for every such vocabulary, as GroupForm is
// for their groups, so a new one is a `KINDS` entry rather than a third copy
// (MB.132): a name, a description and the group it is filed under, validated
// by the shared schema before the mutation and again by the service, and on
// an existing value a delete behind a confirmation. A kind whose rename
// reaches further than its row says so (MB.162). No rename here moves a
// compendium entry's address since MB.220, so none asks to end a redirect.
// It holds no modal of its own; the page puts it in one
// (claude-docs/components/grouped-value-form.md).

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

const CreateIngredientFormValueDocument = graphql(`
  mutation CreateIngredientFormValue($input: IngredientFormValueInput!) {
    createIngredientFormValue(input: $input) {
      id
      slug
    }
  }
`);

const UpdateIngredientFormValueDocument = graphql(`
  mutation UpdateIngredientFormValue($id: ID!, $input: IngredientFormValueInput!) {
    updateIngredientFormValue(id: $id, input: $input) {
      id
      slug
    }
  }
`);

const DeleteIngredientFormValueDocument = graphql(`
  mutation DeleteIngredientFormValue($id: ID!) {
    deleteIngredientFormValue(id: $id)
  }
`);

const CreateDeityDocument = graphql(`
  mutation CreateDeity($input: DeityInput!) {
    createDeity(input: $input) {
      id
      slug
    }
  }
`);

const UpdateDeityDocument = graphql(`
  mutation UpdateDeity($id: ID!, $input: DeityInput!) {
    updateDeity(id: $id, input: $input) {
      id
      slug
    }
  }
`);

const DeleteDeityDocument = graphql(`
  mutation DeleteDeity($id: ID!) {
    deleteDeity(id: $id)
  }
`);

const FIELDS = ['name', 'description', 'groupId'] as const;
type FieldName = (typeof FIELDS)[number];

const EMPTY: GroupedValueValues = { name: '', description: '', groupId: '' };

/**
 * A kind as the form uses it, from its declaration: the input type stays
 * inside, so `KINDS` can hold kinds whose inputs differ — one that calls the
 * group `traditionId`, say — without a cast at each request.
 */
function defineKind<Input extends object>({
  schema,
  toInput,
  create,
  update,
  remove,
  ...copy
}: GroupedValueKindSpec<Input>): GroupedValueFormKind {
  return {
    ...copy,
    resolver: zodResolver(schema),
    save: async (values, id) => {
      const input = toInput(values);
      if (id) {
        await graphqlRequest(update, { id, input });
        return;
      }
      // Widened, since `VariablesArg` cannot decide `{ input: Input }` while
      // `Input` is generic; the spec has already held the document to it.
      const widened = create as TypedDocumentNode<unknown, { input: object }>;
      await graphqlRequest<unknown, { input: object }>(widened, { input });
    },
    remove: async (id) => {
      await graphqlRequest(remove, { id });
    },
  };
}

/**
 * What differs between the vocabularies: their copy, their schema and input,
 * and their mutations. A kind whose input names the group otherwise maps it
 * back with `inputKeys` and `toInput`; the category and form inputs are the
 * values themselves.
 */
const KINDS: Record<GroupedValueKind, GroupedValueFormKind> = {
  category: defineKind({
    noun: 'Category',
    groupLabel: 'Group',
    groupPlaceholder: 'Choose a group',
    deleteNote: "Covens' ingredients and spells filed under it lose it too.",
    schema: CategoryInput,
    toInput: (values) => values,
    create: CreateCategoryDocument,
    update: UpdateCategoryDocument,
    remove: DeleteCategoryDocument,
  }),
  form: defineKind({
    noun: 'Form',
    groupLabel: 'Group',
    groupPlaceholder: 'Choose a group',
    deleteNote:
      "It can't be deleted while a compendium entry picks it. Covens' ingredients keep what they wrote, which then counts as their own value rather than a curated one; nothing of theirs changes.",
    // A rename carries onto every compendium entry that picked the form
    // (MB.162), though no entry's address moves: a form is no part of one
    // since MB.220.
    renameNote: 'Saving renames it on every compendium entry that picked it.',
    schema: IngredientFormValueInput,
    toInput: (values) => values,
    create: CreateIngredientFormValueDocument,
    update: UpdateIngredientFormValueDocument,
    remove: DeleteIngredientFormValueDocument,
  }),
  deity: defineKind({
    noun: 'Deity',
    groupLabel: 'Tradition',
    groupPlaceholder: 'Choose a tradition',
    deleteNote:
      "It can't be deleted while a compendium entry picks it. Covens' ingredients keep what they wrote, which then counts as their own value rather than a curated one; nothing of theirs changes.",
    // A rename carries onto every compendium entry that picked the deity
    // (MB.162), though no entry's address moves: a deity is no part of one.
    renameNote: 'Saving renames it on every compendium entry that picked it.',
    // The input calls the group its tradition; the form's field stays `groupId`.
    inputKeys: { groupId: 'traditionId' },
    schema: DeityInput.omit({ traditionId: true }).extend({
      groupId: DeityInput.shape.traditionId,
    }),
    toInput: ({ groupId, ...rest }) => ({ ...rest, traditionId: groupId }),
    create: CreateDeityDocument,
    update: UpdateDeityDocument,
    remove: DeleteDeityDocument,
  }),
};

/** The field an input key names, under the kind's own name for it where it has one. */
const fieldOf = ({ inputKeys }: GroupedValueFormKind, key: unknown): FieldName | undefined =>
  FIELDS.find((field) => (inputKeys?.[field] ?? field) === key);

/**
 * The asterisk beside a required field's label, for the eye: hidden from the
 * field's name, so a screen reader hears the label and the control's
 * `aria-required` rather than "star", as IngredientForm's is.
 */
const Required = (): ReactElement => (
  <span className="grouped-value-form__required" aria-hidden="true">
    *
  </span>
);

const GroupedValueForm = ({ kind, value, groups, onDone }: GroupedValueFormProps): ReactElement => {
  const id = useId();
  const ids = (field: string) => ({ control: `${id}-${field}`, error: `${id}-${field}-error` });
  const spec = KINDS[kind];
  const { noun, groupLabel, groupPlaceholder, deleteNote, renameNote } = spec;
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<GroupedValueValues>({
    defaultValues: value
      ? { name: value.name, description: value.description, groupId: value.groupId }
      : EMPTY,
    resolver: spec.resolver,
  });
  const [confirming, setConfirming] = useState(false);
  const [alert, setAlert] = useState<string>();
  const values = useWatch({ control });
  // Trimmed, as the schema trims: a space added to the end renames nothing.
  const renamed =
    renameNote !== undefined && value !== undefined && (values.name ?? '').trim() !== value.name;

  const save = useMutation({
    mutationFn: (input: GroupedValueValues) => spec.save(input, value?.id),
  });

  const remove = useMutation({ mutationFn: (valueId: string) => spec.remove(valueId) });

  /** Sends the input; a refusal lands beside its field, or above the fields. */
  const send = async (input: GroupedValueValues): Promise<void> => {
    setAlert(undefined);
    try {
      await save.mutateAsync(input);
      onDone();
    } catch (error) {
      const unplaced: string[] = [];
      for (const { path, message } of readGraphqlIssues(error)) {
        const [key, ...rest] = path;
        const field = rest.length === 0 ? fieldOf(spec, key) : undefined;
        if (field) setError(field, { type: 'server', message });
        else unplaced.push(message);
      }
      if (unplaced.length > 0) setError('root', { type: 'server', message: unplaced.join(' ') });
    }
  };

  const confirmDelete = async (): Promise<void> => {
    if (!value) return;
    setAlert(undefined);
    try {
      await remove.mutateAsync(value.id);
      onDone();
    } catch (error) {
      // Not a bad value in a box: a refusal naming its remedy (DESIGN.md §7).
      setConfirming(false);
      setAlert(readGraphqlIssues(error)[0]?.message ?? GENERIC_FAILURE);
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
  const noteId = `${id}-rename-note`;

  const actions = (): ReactElement => {
    if (confirming) {
      return (
        <div className="grouped-value-form__confirm">
          <p>
            Delete &quot;{value?.name}&quot;? {deleteNote}
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
      );
    }
    return (
      <>
        {/* Before Save is pressed rather than after: a kind whose rename
            reaches past its row says so while the name differs. */}
        {renamed && (
          <p id={noteId} className="field__hint grouped-value-form__note">
            {renameNote}
          </p>
        )}
        <div className="modal__actions grouped-value-form__actions">
          {/* Offered only when there is something to save — nothing typed on a
              new value, nothing changed on an existing one — the owner's rule
              for every form; and busy, saying so, from the press to the
              answer. */}
          <button
            type="submit"
            className="btn btn--solid"
            disabled={!isDirty || isSubmitting}
            aria-busy={isSubmitting || undefined}
            aria-describedby={renamed ? noteId : undefined}
          >
            {isSubmitting && <span className="spinner" aria-hidden="true" />}
            {isSubmitting ? `Saving ${noun}` : `Save ${noun}`}
          </button>
          <button type="button" className="btn btn--quiet" onClick={onDone}>
            Cancel
          </button>
          {value && (
            <button
              type="button"
              className="btn btn--destructive grouped-value-form__delete"
              onClick={() => {
                setAlert(undefined);
                setConfirming(true);
              }}
            >
              Delete {noun}
            </button>
          )}
        </div>
      </>
    );
  };

  return (
    <form
      className="form grouped-value-form"
      onSubmit={handleSubmit((input) => send(input))}
      noValidate
    >
      {rootError && <Notice kind="error">{rootError}</Notice>}
      <div className="field">
        <label className="field__label" htmlFor={ids('name').control}>
          Name
          <Required />
        </label>
        <input
          id={ids('name').control}
          className="input"
          // Off: Chrome takes a field named "name" for a person's and offers the user's own.
          autoComplete="off"
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
          {groupLabel}
          <Required />
        </label>
        <Controller
          control={control}
          name="groupId"
          render={({ field }) => (
            <ComboboxSelect
              id={ids('groupId').control}
              label={groupLabel}
              labelId={`${id}-group-label`}
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              choices={choices}
              placeholder={groupPlaceholder}
              required
              inputRef={field.ref}
              {...fieldAria('groupId')}
            />
          )}
        />
        {fieldError('groupId')}
      </div>
      {actions()}
    </form>
  );
};

export default GroupedValueForm;
