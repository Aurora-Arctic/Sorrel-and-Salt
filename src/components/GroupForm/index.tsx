'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { ClientError } from 'graphql-request';
import { type ReactElement, useId, useRef, useState } from 'react';
import { Controller, type Resolver, useForm, useWatch } from 'react-hook-form';
import { graphql } from '../../gql';
import { graphqlRequest } from '../../lib/graphql-client';
import { pairedColor } from '../../lib/group-colors';
import type { GroupColorColumn, ValidationIssue } from '../../lib/types';
import ChipColorField from '../ChipColorField';
import { ComboboxSelect } from '../Combobox';
import { CategoryGroupInput } from '@/modules/vocabulary/validation/category-group';
import { IngredientFormGroupInput } from '@/modules/vocabulary/validation/ingredient-form-group';
import type { DeleteStep, GroupFormProps, GroupKind, GroupValues } from './types';
import './index.scss';

// The admin's form for a group (M5.6b), one for both group vocabularies so
// MB.132's traditions can take it too: a name and a description, and for a
// category group its chip's two colours, validated by the shared schema before
// the mutation — the contrast floor included (MB.36) — and again by the
// service. A group holding rows is deleted only once they have somewhere to
// go: Delete Group first asks which group, then asks to confirm that move, the
// owner's call. It holds no modal of its own; the page puts it in one
// (claude-docs/components/group-form.md).

const CreateCategoryGroupDocument = graphql(`
  mutation CreateCategoryGroup($input: CategoryGroupInput!) {
    createCategoryGroup(input: $input) {
      id
      slug
    }
  }
`);

const UpdateCategoryGroupDocument = graphql(`
  mutation UpdateCategoryGroup($id: ID!, $input: CategoryGroupInput!) {
    updateCategoryGroup(id: $id, input: $input) {
      id
      slug
    }
  }
`);

const DeleteCategoryGroupDocument = graphql(`
  mutation DeleteCategoryGroup($id: ID!, $moveTo: ID) {
    deleteCategoryGroup(id: $id, moveTo: $moveTo)
  }
`);

const CreateIngredientFormGroupDocument = graphql(`
  mutation CreateIngredientFormGroup($input: IngredientFormGroupInput!) {
    createIngredientFormGroup(input: $input) {
      id
      slug
    }
  }
`);

const UpdateIngredientFormGroupDocument = graphql(`
  mutation UpdateIngredientFormGroup($id: ID!, $input: IngredientFormGroupInput!) {
    updateIngredientFormGroup(id: $id, input: $input) {
      id
      slug
    }
  }
`);

const DeleteIngredientFormGroupDocument = graphql(`
  mutation DeleteIngredientFormGroup($id: ID!, $moveTo: ID) {
    deleteIngredientFormGroup(id: $id, moveTo: $moveTo)
  }
`);

const GENERIC_ERROR = "That didn't work. Please try again.";

const FIELDS = ['name', 'description', 'colorDark', 'colorLight'] as const;
type FieldName = (typeof FIELDS)[number];

const EMPTY: GroupValues = { name: '', description: '', colorDark: '', colorLight: '' };

/** What differs between the two vocabularies: the rows a group holds, and what a move does to them. */
const KINDS: Record<
  GroupKind,
  { one: string; many: string; moved: string; resolver: Resolver<GroupValues> }
> = {
  category: {
    one: 'category',
    many: 'categories',
    moved: 'Each keeps its name, its address and every entry filed under it.',
    // The schema's output is the input the mutation takes; its type is the values'.
    resolver: zodResolver(CategoryGroupInput) as unknown as Resolver<GroupValues>,
  },
  form: {
    one: 'form',
    many: 'forms',
    moved:
      'Each keeps its name, and its address follows its new group; every ingredient that picked one keeps it.',
    // Drops the two empty colours, which a form group's input does not take.
    resolver: zodResolver(IngredientFormGroupInput) as unknown as Resolver<GroupValues>,
  },
};

const WHOLE = /^#[0-9a-f]{6}$/i;

const PARTNER: Record<GroupColorColumn, GroupColorColumn> = {
  colorDark: 'colorLight',
  colorLight: 'colorDark',
};

const COLORS: { column: GroupColorColumn; label: string }[] = [
  { column: 'colorDark', label: 'Dark Theme Colour' },
  { column: 'colorLight', label: 'Light Theme Colour' },
];

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
  <span className="group-form__required" aria-hidden="true">
    *
  </span>
);

const GroupForm = ({
  kind,
  group,
  groups,
  memberCount = 0,
  onDone,
}: GroupFormProps): ReactElement => {
  const id = useId();
  const ids = (field: string) => ({ control: `${id}-${field}`, error: `${id}-${field}-error` });
  const { one, many, moved, resolver } = KINDS[kind];
  const {
    register,
    control,
    handleSubmit,
    setError,
    setValue,
    getValues,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<GroupValues>({
    defaultValues: group
      ? {
          name: group.name,
          description: group.description,
          colorDark: group.colorDark,
          colorLight: group.colorLight,
        }
      : EMPTY,
    resolver,
  });
  const typedName = useWatch({ control, name: 'name' });
  // Each colour field's partner, which its Match button sets it from.
  const typedColors = useWatch({ control, name: ['colorDark', 'colorLight'] });
  const typed = { colorDark: typedColors[0], colorLight: typedColors[1] };
  // The partner each colour last filled, so it keeps following only while
  // the admin has not set it themselves (claude-docs/components/group-form.md,
  // "The pair").
  const filled = useRef<Partial<Record<GroupColorColumn, string>>>({});
  const fillPartner = (column: GroupColorColumn, value: string): void => {
    if (!WHOLE.test(value)) return;
    const partner = PARTNER[column];
    const current = getValues(partner);
    if (current !== '' && current !== filled.current[partner]) return;
    const paired = pairedColor(value, partner);
    filled.current[partner] = paired;
    setValue(partner, paired, { shouldDirty: true });
  };
  const [step, setStep] = useState<DeleteStep>({ at: 'idle' });
  const [moveTo, setMoveTo] = useState('');
  const [moveError, setMoveError] = useState<string>();
  const [alert, setAlert] = useState<string>();

  const save = useMutation({
    mutationFn: async (input: GroupValues): Promise<void> => {
      if (kind === 'category') {
        if (group) await graphqlRequest(UpdateCategoryGroupDocument, { id: group.id, input });
        else await graphqlRequest(CreateCategoryGroupDocument, { input });
      } else if (group) {
        await graphqlRequest(UpdateIngredientFormGroupDocument, { id: group.id, input });
      } else {
        await graphqlRequest(CreateIngredientFormGroupDocument, { input });
      }
    },
  });

  const remove = useMutation({
    mutationFn: async (target: string | undefined): Promise<void> => {
      if (!group) return;
      // No `moveTo` at all for a group holding nothing, rather than a null.
      const variables: { id: string; moveTo?: string } = target
        ? { id: group.id, moveTo: target }
        : { id: group.id };
      if (kind === 'category') await graphqlRequest(DeleteCategoryGroupDocument, variables);
      else await graphqlRequest(DeleteIngredientFormGroupDocument, variables);
    },
  });

  /** Sends the input; a refusal lands beside its field, or above them all. */
  const send = async (input: GroupValues): Promise<void> => {
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

  const confirmDelete = async (target: string | undefined): Promise<void> => {
    setAlert(undefined);
    setMoveError(undefined);
    try {
      await remove.mutateAsync(target);
      onDone();
    } catch (error) {
      // A refused move goes back to the choice, beside the picker that made
      // it; anything else is a refusal naming its remedy (DESIGN.md §7).
      const issues = issuesOf(error);
      const onMove = issues.find(({ path }) => path.length === 1 && path[0] === 'moveTo');
      if (onMove && memberCount > 0) {
        setMoveError(onMove.message);
        setStep({ at: 'choosing' });
      } else {
        setStep({ at: 'idle' });
        setAlert(issues.map(({ message }) => message).join(' '));
      }
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
  const others = groups.filter((each) => each.id !== group?.id);
  const rows = `${memberCount} ${memberCount === 1 ? one : many}`;
  const rootError = errors.root?.message ?? alert;

  const deleteButton = (label: string, target: string | undefined) => (
    <button
      type="button"
      className="btn btn--destructive"
      disabled={remove.isPending}
      aria-busy={remove.isPending || undefined}
      onClick={() => void confirmDelete(target)}
    >
      {remove.isPending && <span className="spinner" aria-hidden="true" />}
      {remove.isPending ? 'Deleting' : label}
    </button>
  );
  const keepIt = (
    <button
      type="button"
      className="btn btn--quiet"
      onClick={() => {
        setMoveError(undefined);
        setStep({ at: 'idle' });
      }}
    >
      Keep It
    </button>
  );

  const choosing = (): ReactElement => {
    if (others.length === 0) {
      return (
        <div className="group-form__confirm">
          <p>
            &quot;{group?.name}&quot; holds {rows}, and there is no other group to move them to. Add
            another group first.
          </p>
          <div className="modal__actions">{keepIt}</div>
        </div>
      );
    }
    const label = `Move its ${rows} to`;
    const moveIds = ids('moveTo');
    return (
      <div className="group-form__confirm">
        <div className="field">
          <label className="field__label" id={`${id}-move-label`} htmlFor={moveIds.control}>
            {label}
          </label>
          <ComboboxSelect
            id={moveIds.control}
            label={label}
            labelId={`${id}-move-label`}
            value={moveTo}
            onChange={(value) => {
              setMoveTo(value);
              setMoveError(undefined);
            }}
            choices={others.map((each) => ({ value: each.id, label: each.name }))}
            placeholder="Choose a group"
            required
            aria-invalid={moveError ? true : undefined}
            aria-describedby={moveError ? moveIds.error : undefined}
          />
          {moveError && (
            <p id={moveIds.error} className="field__error">
              {moveError}
            </p>
          )}
        </div>
        <div className="modal__actions">
          <button
            type="button"
            className="btn btn--solid"
            disabled={!moveTo}
            onClick={() => setStep({ at: 'confirming', moveTo })}
          >
            Continue
          </button>
          {keepIt}
        </div>
      </div>
    );
  };

  const confirming = (target: string | undefined): ReactElement => {
    const destination = others.find((each) => each.id === target);
    if (!destination) {
      return (
        <div className="group-form__confirm">
          <p>
            Delete &quot;{group?.name}&quot;? No {one} is filed under it.
          </p>
          <div className="modal__actions">
            {deleteButton('Delete', undefined)}
            {keepIt}
          </div>
        </div>
      );
    }
    return (
      <div className="group-form__confirm">
        <p>
          Move {rows} to &quot;{destination.name}&quot; and delete &quot;{group?.name}&quot;?{' '}
          {moved}
        </p>
        <div className="modal__actions">
          {deleteButton('Move and Delete', destination.id)}
          <button
            type="button"
            className="btn btn--quiet"
            onClick={() => setStep({ at: 'choosing' })}
          >
            Back
          </button>
        </div>
      </div>
    );
  };

  const actions = (): ReactElement => {
    if (step.at === 'choosing') return choosing();
    if (step.at === 'confirming') return confirming(step.moveTo);
    return (
      <div className="modal__actions group-form__actions">
        {/* Offered only when there is something to save, and busy, saying
            so, from the press to the answer — the owner's rule for every form. */}
        <button
          type="submit"
          className="btn btn--solid"
          disabled={!isDirty || isSubmitting}
          aria-busy={isSubmitting || undefined}
        >
          {isSubmitting && <span className="spinner" aria-hidden="true" />}
          {isSubmitting ? 'Saving Group' : 'Save Group'}
        </button>
        <button type="button" className="btn btn--quiet" onClick={onDone}>
          Cancel
        </button>
        {group && (
          <button
            type="button"
            className="btn btn--destructive group-form__delete"
            onClick={() => {
              setAlert(undefined);
              setStep(memberCount > 0 ? { at: 'choosing' } : { at: 'confirming' });
            }}
          >
            Delete Group
          </button>
        )}
      </div>
    );
  };

  return (
    <form className="form group-form" onSubmit={handleSubmit((input) => send(input))} noValidate>
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
      {kind === 'category' && (
        <>
          {COLORS.map(({ column, label }) => (
            <div className="field" key={column}>
              <label className="field__label" htmlFor={ids(column).control}>
                {label}
                <Required />
              </label>
              <Controller
                control={control}
                name={column}
                render={({ field }) => (
                  <ChipColorField
                    id={ids(column).control}
                    label={label}
                    column={column}
                    value={field.value}
                    onChange={(value) => {
                      field.onChange(value);
                      fillPartner(column, value);
                    }}
                    onBlur={field.onBlur}
                    sample={typedName.trim() || 'Sample'}
                    partner={typed[PARTNER[column]]}
                    others={groups.flatMap((each) => {
                      const hex = each[column];
                      return each.id !== group?.id && hex ? [{ name: each.name, hex }] : [];
                    })}
                    inputRef={field.ref}
                    error={errors[column]?.message}
                    errorId={ids(column).error}
                    aria-required
                    {...fieldAria(column)}
                  />
                )}
              />
            </div>
          ))}
        </>
      )}
      {actions()}
    </form>
  );
};

export default GroupForm;
