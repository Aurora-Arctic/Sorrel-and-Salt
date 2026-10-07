'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { ClientError } from 'graphql-request';
import { type ReactElement, useId, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { graphql } from '../../gql';
import { graphqlRequest } from '../../lib/graphql-client';
import type { ValidationIssue } from '../../lib/types';
import { VOCABULARY_COPY } from '../VocabularyValueList/vocabularies';
import { PlanetInput, ZodiacSignInput } from '@/modules/vocabulary/validation/astrology-value';
import type { FlatVocabulary } from '../VocabularyValueList/types';
import type { VocabularyValueFormProps, VocabularyValueValues } from './types';
import './index.scss';

// The admin's form for a flat curated vocabulary (MB.95): a name and a
// description, validated by the vocabulary's shared schema before the
// mutation and again by the service, and on an existing value a delete behind
// a confirmation. IngredientFormValueForm's shape without the group, and
// without the redirect question: a planet or a sign is no part of an entry's
// slug. A rename carries onto the entries listing it (MB.162), so it says so.
// It holds no modal of its own; the page puts it in one
// (claude-docs/components/vocabulary-value-form.md).

const CreatePlanetDocument = graphql(`
  mutation CreatePlanet($input: PlanetInput!) {
    createPlanet(input: $input) {
      id
    }
  }
`);

const UpdatePlanetDocument = graphql(`
  mutation UpdatePlanet($id: ID!, $input: PlanetInput!) {
    updatePlanet(id: $id, input: $input) {
      id
    }
  }
`);

const DeletePlanetDocument = graphql(`
  mutation DeletePlanet($id: ID!) {
    deletePlanet(id: $id)
  }
`);

const CreateZodiacSignDocument = graphql(`
  mutation CreateZodiacSign($input: ZodiacSignInput!) {
    createZodiacSign(input: $input) {
      id
    }
  }
`);

const UpdateZodiacSignDocument = graphql(`
  mutation UpdateZodiacSign($id: ID!, $input: ZodiacSignInput!) {
    updateZodiacSign(id: $id, input: $input) {
      id
    }
  }
`);

const DeleteZodiacSignDocument = graphql(`
  mutation DeleteZodiacSign($id: ID!) {
    deleteZodiacSign(id: $id)
  }
`);

/** Each vocabulary's schema and its three writes, which take the same variables. */
const WRITES: Record<
  FlatVocabulary,
  {
    schema: typeof PlanetInput;
    create: (input: VocabularyValueValues) => Promise<unknown>;
    update: (id: string, input: VocabularyValueValues) => Promise<unknown>;
    remove: (id: string) => Promise<unknown>;
  }
> = {
  planets: {
    schema: PlanetInput,
    create: (input) => graphqlRequest(CreatePlanetDocument, { input }),
    update: (id, input) => graphqlRequest(UpdatePlanetDocument, { id, input }),
    remove: (id) => graphqlRequest(DeletePlanetDocument, { id }),
  },
  zodiacSigns: {
    schema: ZodiacSignInput,
    create: (input) => graphqlRequest(CreateZodiacSignDocument, { input }),
    update: (id, input) => graphqlRequest(UpdateZodiacSignDocument, { id, input }),
    remove: (id) => graphqlRequest(DeleteZodiacSignDocument, { id }),
  },
};

const GENERIC_ERROR = "That didn't work. Please try again.";

const FIELDS = ['name', 'description'] as const;
type FieldName = (typeof FIELDS)[number];

const EMPTY: VocabularyValueValues = { name: '', description: '' };

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
 * `aria-required` rather than "star".
 */
const Required = (): ReactElement => (
  <span className="vocabulary-value-form__required" aria-hidden="true">
    *
  </span>
);

const VocabularyValueForm = ({
  vocabulary,
  value,
  onDone,
}: VocabularyValueFormProps): ReactElement => {
  const id = useId();
  const ids = (field: string) => ({ control: `${id}-${field}`, error: `${id}-${field}-error` });
  const { label } = VOCABULARY_COPY[vocabulary];
  const writes = WRITES[vocabulary];
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<VocabularyValueValues>({
    defaultValues: value ? { name: value.name, description: value.description } : EMPTY,
    resolver: zodResolver(writes.schema),
  });
  const [confirming, setConfirming] = useState(false);
  const [alert, setAlert] = useState<string>();
  const name = useWatch({ control, name: 'name' });
  // Trimmed, as the schema trims: a space added to the end renames nothing.
  const renamed = value !== undefined && (name ?? '').trim() !== value.name;

  const save = useMutation({
    mutationFn: (input: VocabularyValueValues) =>
      value ? writes.update(value.id, input) : writes.create(input),
  });

  const remove = useMutation({ mutationFn: (valueId: string) => writes.remove(valueId) });

  /** Sends the input; a refusal lands beside its field, or above the fields. */
  const send = async (input: VocabularyValueValues): Promise<void> => {
    setAlert(undefined);
    try {
      await save.mutateAsync(input);
      onDone();
    } catch (error) {
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
    if (!value) return;
    setAlert(undefined);
    try {
      await remove.mutateAsync(value.id);
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
  const rootError = errors.root?.message ?? alert;
  const noteId = `${id}-rename-note`;

  const actions = (): ReactElement => {
    if (confirming) {
      return (
        <div className="vocabulary-value-form__confirm">
          <p>
            Delete &quot;{value?.name}&quot;? It can&apos;t be deleted while a compendium entry
            lists it. Covens&apos; ingredients keep what they wrote, which then counts as their own
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
    return (
      <>
        {/* A rename carries onto every compendium entry listing the value
            (MB.162), so the admin hears it before pressing Save rather than
            after. */}
        {renamed && (
          <p id={noteId} className="field__hint vocabulary-value-form__note">
            Saving renames it on every compendium entry that lists it.
          </p>
        )}
        <div className="modal__actions vocabulary-value-form__actions">
          {/* Offered only when there is something to save, and busy, saying
              so, from the press to the answer — the owner's rule for every
              form. */}
          <button
            type="submit"
            className="btn btn--solid"
            disabled={!isDirty || isSubmitting}
            aria-busy={isSubmitting || undefined}
            aria-describedby={renamed ? noteId : undefined}
          >
            {isSubmitting && <span className="spinner" aria-hidden="true" />}
            {isSubmitting ? `Saving ${label}` : `Save ${label}`}
          </button>
          <button type="button" className="btn btn--quiet" onClick={onDone}>
            Cancel
          </button>
          {value && (
            <button
              type="button"
              className="btn btn--destructive vocabulary-value-form__delete"
              onClick={() => {
                setAlert(undefined);
                setConfirming(true);
              }}
            >
              Delete {label}
            </button>
          )}
        </div>
      </>
    );
  };

  return (
    <form
      className="form vocabulary-value-form"
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
      {actions()}
    </form>
  );
};

export default VocabularyValueForm;
