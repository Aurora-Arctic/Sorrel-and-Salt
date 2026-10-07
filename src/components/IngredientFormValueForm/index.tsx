'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { ClientError } from 'graphql-request';
import { type ReactElement, useId, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { graphql } from '../../gql';
import { graphqlRequest } from '../../lib/graphql-client';
import type { ValidationIssue } from '../../lib/types';
import { ComboboxSelect } from '../Combobox';
import { IngredientFormValueInput } from '@/modules/vocabulary/validation/ingredient-form-value';
import type {
  IngredientFormValueFormProps,
  IngredientFormValueValues,
  RedirectQuestion,
} from './types';
import './index.scss';

// The admin's form for the curated ingredient-form vocabulary (M5.6a): a
// name, a description and the form group it is filed under, validated by the
// shared schema before the mutation and again by the service, and on an
// existing form a delete behind a confirmation. CategoryForm's shape, plus
// what a form's place in the compendium adds: a rename carries onto the
// entries that picked it (MB.162), so it says so, and one that would take a
// slug another entry redirects from asks first (MB.82). It holds no modal of
// its own; the page puts it in one
// (claude-docs/components/ingredient-form-value-form.md).

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

const GENERIC_ERROR = "That didn't work. Please try again.";

const FIELDS = ['name', 'description', 'groupId'] as const;
type FieldName = (typeof FIELDS)[number];

const EMPTY: IngredientFormValueValues = { name: '', description: '', groupId: '' };

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
 * `aria-required` rather than "star", as CategoryForm's is.
 */
const Required = (): ReactElement => (
  <span className="ingredient-form-value-form__required" aria-hidden="true">
    *
  </span>
);

const IngredientFormValueForm = ({
  formValue,
  groups,
  onDone,
}: IngredientFormValueFormProps): ReactElement => {
  const id = useId();
  const ids = (field: string) => ({ control: `${id}-${field}`, error: `${id}-${field}-error` });
  const {
    register,
    control,
    handleSubmit,
    setError,
    getValues,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<IngredientFormValueValues>({
    defaultValues: formValue
      ? { name: formValue.name, description: formValue.description, groupId: formValue.groupId }
      : EMPTY,
    resolver: zodResolver(IngredientFormValueInput),
  });
  const [confirming, setConfirming] = useState(false);
  const [alert, setAlert] = useState<string>();
  const [asked, setAsked] = useState<RedirectQuestion>();
  const values = useWatch({ control });
  // Trimmed, as the schema trims: a space added to the end renames nothing.
  const renamed = formValue !== undefined && (values.name ?? '').trim() !== formValue.name;
  // The question is about the input that was refused: an edit makes it
  // another input, so it stands only while the fields are as they were.
  const question =
    asked && FIELDS.every((field) => values[field] === asked.typed[field]) ? asked : undefined;

  const save = useMutation({
    mutationFn: async (input: IngredientFormValueInput): Promise<void> => {
      if (formValue)
        await graphqlRequest(UpdateIngredientFormValueDocument, { id: formValue.id, input });
      else await graphqlRequest(CreateIngredientFormValueDocument, { input });
    },
  });

  const remove = useMutation({
    mutationFn: (formId: string) =>
      graphqlRequest(DeleteIngredientFormValueDocument, { id: formId }),
  });

  /** Sends the input; a refusal lands beside its field, or asks to end a redirect. */
  const send = async (input: IngredientFormValueValues, endRedirect?: true): Promise<void> => {
    setAlert(undefined);
    try {
      await save.mutateAsync(endRedirect ? { ...input, endRedirect } : input);
      onDone();
    } catch (error) {
      // Beside the field it names; the redirect as a question; anything else
      // above the fields. A question already asked stays until this answer,
      // so Rename Anyway is busy in its place rather than swapped for Save.
      let next: RedirectQuestion | undefined;
      const unplaced: string[] = [];
      for (const { path, message } of issuesOf(error)) {
        const [field, ...rest] = path;
        if (rest.length === 0 && field === 'endRedirect')
          next = { message, input, typed: getValues() };
        else if (rest.length === 0 && isField(field)) setError(field, { type: 'server', message });
        else unplaced.push(message);
      }
      setAsked(next);
      if (unplaced.length > 0) setError('root', { type: 'server', message: unplaced.join(' ') });
    }
  };

  const confirmDelete = async (): Promise<void> => {
    if (!formValue) return;
    setAlert(undefined);
    try {
      await remove.mutateAsync(formValue.id);
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
  const noteId = `${id}-rename-note`;

  const actions = (): ReactElement => {
    if (confirming) {
      return (
        <div className="ingredient-form-value-form__confirm">
          <p>
            Delete &quot;{formValue?.name}&quot;? It can&apos;t be deleted while a compendium entry
            picks it. Covens&apos; ingredients keep what they wrote, which then counts as their own
            value rather than a curated one; nothing of theirs changes.
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
    if (question) {
      // The service's own sentence names the entries and when their windows
      // close; confirmed, the same input goes again, carrying `endRedirect`.
      return (
        <div className="ingredient-form-value-form__confirm">
          <p role="alert">{question.message}</p>
          <div className="modal__actions">
            <button
              type="button"
              className="btn btn--solid"
              disabled={save.isPending}
              aria-busy={save.isPending || undefined}
              onClick={() => void send(question.input, true)}
            >
              {save.isPending && <span className="spinner" aria-hidden="true" />}
              {save.isPending ? 'Renaming' : 'Rename Anyway'}
            </button>
            <button type="button" className="btn btn--quiet" onClick={() => setAsked(undefined)}>
              Keep Editing
            </button>
          </div>
        </div>
      );
    }
    return (
      <>
        {/* A rename carries onto every compendium entry that picked the form,
            and a form is part of an entry's slug (MB.162), so the admin hears
            it before pressing Save rather than after. */}
        {renamed && (
          <p id={noteId} className="field__hint ingredient-form-value-form__note">
            Saving renames it on every compendium entry that picked it, which can move those
            entries&apos; addresses.
          </p>
        )}
        <div className="modal__actions ingredient-form-value-form__actions">
          {/* Offered only when there is something to save — nothing typed on a
              new form, nothing changed on an existing one — the owner's rule
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
            {isSubmitting ? 'Saving Form' : 'Save Form'}
          </button>
          <button type="button" className="btn btn--quiet" onClick={onDone}>
            Cancel
          </button>
          {formValue && (
            <button
              type="button"
              className="btn btn--destructive ingredient-form-value-form__delete"
              onClick={() => {
                setAlert(undefined);
                setConfirming(true);
              }}
            >
              Delete Form
            </button>
          )}
        </div>
      </>
    );
  };

  return (
    <form
      className="form ingredient-form-value-form"
      onSubmit={handleSubmit((input) => send(input))}
      noValidate
    >
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
      {actions()}
    </form>
  );
};

export default IngredientFormValueForm;
