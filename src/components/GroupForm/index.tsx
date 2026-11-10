'use client';

import { typedResolver } from '../../lib/typed-resolver';
import { useMutation } from '@tanstack/react-query';
import { type ReactElement, useId, useRef, useState } from 'react';
import { Controller, FormProvider, useForm, useWatch } from 'react-hook-form';
import { graphql } from '@/lib/graphql-document';
import { HEX_COLOR } from '../../lib/contrast';
import { graphqlRequest, saveRequest } from '../../lib/graphql-client';
import { readGraphqlIssues } from '../../lib/graphql-failure';
import { pairedColor } from '../../lib/group-colors';
import { capitalise, plural } from '../../lib/text';
import type { GroupColorColumn } from '../../lib/types';
import ChipColorField from '../ChipColorField';
import { ComboboxSelect } from '../Combobox';
import FormIcon from '../FormIcon';
import { KINDS as VALUE_LIST_KINDS } from '../GroupedValueList/kinds';
import { KINDS as GROUP_LIST_KINDS } from '../GroupList/kinds';
import {
  FieldShell,
  FormActions,
  FormHistoryButtons,
  FormHistoryContext,
  RadioGroupField,
  TextField,
  fieldDescription,
  useEntityForm,
  FormErrorSummary,
} from '../Field';
import type { RadioOption } from '../Field/types';
import { ConfirmOverlay, ConfirmQuestion, DiscardQuestion, useDiscardGuard } from '../Modal';
import Notice from '../Notice';
import { z } from 'zod';
import { FORM_GROUP_ICONS, type FormGroupIcon } from '@/modules/vocabulary/schema/form-group-icons';
import { CategoryGroupInput } from '@/modules/vocabulary/validation/category-group';
import { DeityTraditionInput } from '@/modules/vocabulary/validation/deity-tradition';
import { IngredientFormGroupInput } from '@/modules/vocabulary/validation/ingredient-form-group';
import type {
  DeleteStep,
  GroupColorField,
  GroupDeleteVariables,
  GroupFormKind,
  GroupFormProps,
  GroupKind,
  GroupKindSpec,
  GroupValues,
} from './types';

// The admin's form for a group, for both group vocabularies and the deity traditions: a name, a
// description and, for a category group, its chip's two colours, validated by the shared schema and the
// service. Delete Group asks which group takes the rows (claude-docs/components/group-form.md).

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
      icon
    }
  }
`);

const UpdateIngredientFormGroupDocument = graphql(`
  mutation UpdateIngredientFormGroup($id: ID!, $input: IngredientFormGroupInput!) {
    updateIngredientFormGroup(id: $id, input: $input) {
      id
      slug
      icon
    }
  }
`);

const DeleteIngredientFormGroupDocument = graphql(`
  mutation DeleteIngredientFormGroup($id: ID!, $moveTo: ID) {
    deleteIngredientFormGroup(id: $id, moveTo: $moveTo)
  }
`);

const CreateDeityTraditionDocument = graphql(`
  mutation CreateDeityTradition($input: DeityTraditionInput!) {
    createDeityTradition(input: $input) {
      id
      slug
    }
  }
`);

const UpdateDeityTraditionDocument = graphql(`
  mutation UpdateDeityTradition($id: ID!, $input: DeityTraditionInput!) {
    updateDeityTradition(id: $id, input: $input) {
      id
      slug
    }
  }
`);

const DeleteDeityTraditionDocument = graphql(`
  mutation DeleteDeityTradition($id: ID!, $moveTo: ID) {
    deleteDeityTradition(id: $id, moveTo: $moveTo)
  }
`);

const FIELDS = ['name', 'description', 'colorDark', 'colorLight', 'icon'] as const;
type FieldName = (typeof FIELDS)[number];

const EMPTY: GroupValues = { name: '', description: '', colorDark: '', colorLight: '', icon: '' };

/**
 * A kind as the form uses it, from its declaration, as GroupedValueForm's
 * `defineKind` builds its own: the input type stays inside, so `KINDS` holds
 * kinds whose inputs differ without a cast at each request.
 */
function defineKind<Input extends object>({
  schema,
  create,
  update,
  remove,
  ...copy
}: GroupKindSpec<Input>): GroupFormKind {
  const send = saveRequest(create, update);
  return {
    ...copy,
    resolver: typedResolver<GroupValues>(schema),
    save: (values, id) => send(values as unknown as Input, id),
    remove: async (variables) => {
      await graphqlRequest(remove, variables);
    },
  };
}

const KINDS: Record<GroupKind, GroupFormKind> = {
  category: defineKind({
    // A category's address is its name alone, so a move changes none.
    moved: 'Each category keeps its name, its address and the entries filed under it.',
    schema: CategoryGroupInput,
    create: CreateCategoryGroupDocument,
    update: UpdateCategoryGroupDocument,
    remove: DeleteCategoryGroupDocument,
  }),
  form: defineKind({
    // A form's address carries its group's name, so a move re-addresses it.
    moved: "Each form keeps its name and takes its new group's address.",
    // The schema drops the two empty colours a form group does not take, and reads None as null.
    schema: IngredientFormGroupInput.extend({
      icon: z.preprocess(
        (icon) => (icon === '' ? null : icon),
        IngredientFormGroupInput.shape.icon,
      ),
    }),
    create: CreateIngredientFormGroupDocument,
    update: UpdateIngredientFormGroupDocument,
    remove: DeleteIngredientFormGroupDocument,
  }),
  tradition: defineKind({
    moved: "Each deity keeps its name and takes its new tradition's address.",
    // A tradition is a people or a religion, never a region (DESIGN.md §5).
    schema: DeityTraditionInput,
    create: CreateDeityTraditionDocument,
    update: UpdateDeityTraditionDocument,
    remove: DeleteDeityTraditionDocument,
  }),
};

const PARTNER: Record<GroupColorColumn, GroupColorColumn> = {
  colorDark: 'colorLight',
  colorLight: 'colorDark',
};

const COLORS: GroupColorField[] = [
  {
    column: 'colorDark',
    label: 'Dark Theme Colour',
    hint: "The colour its categories' chips wear in the dark theme, written as # and six hex digits. It must read at 4.5:1 on the dark card, and the light theme's colour is filled from it until you change that one.",
  },
  {
    column: 'colorLight',
    label: 'Light Theme Colour',
    hint: "The colour its categories' chips wear in the light theme, written as # and six hex digits. It must read at 4.5:1 on the light page, and the dark theme's colour is filled from it until you change that one.",
  },
];

const ICONS: readonly RadioOption<FormGroupIcon | ''>[] = [
  ...FORM_GROUP_ICONS.map((icon) => ({
    value: icon,
    label: capitalise(icon),
    icon: <FormIcon name={icon} />,
  })),
  { value: '', label: 'None', icon: <FormIcon name={null} /> },
];

const isField = (key: unknown): key is FieldName => FIELDS.includes(key as FieldName);

const GroupForm = ({
  kind,
  group,
  groups,
  memberCount = 0,
  onDone,
}: GroupFormProps): ReactElement => {
  const id = useId();
  const spec = KINDS[kind];
  const { noun, holds } = GROUP_LIST_KINDS[kind];
  const { noun: one, plural: many } = VALUE_LIST_KINDS[holds];
  const title = capitalise(noun);
  const { moved, resolver } = spec;
  const methods = useForm<GroupValues>({
    defaultValues: group
      ? {
          name: group.name,
          description: group.description,
          colorDark: group.colorDark,
          colorLight: group.colorLight,
          icon: group.icon,
        }
      : EMPTY,
    resolver,
    mode: 'onTouched',
    shouldFocusError: false,
  });
  const {
    control,
    handleSubmit,
    setValue,
    getValues,
    formState: { errors, isSubmitting, isDirty },
  } = methods;
  const typedName = useWatch({ control, name: 'name' });
  const typedColors = useWatch({ control, name: ['colorDark', 'colorLight'] });
  const typed = { colorDark: typedColors[0], colorLight: typedColors[1] };
  // The partner each colour last filled, so it keeps following only while
  // the keeper has not set it themselves (claude-docs/components/group-form.md,
  // "The pair").
  const filled = useRef<Partial<Record<GroupColorColumn, string>>>({});
  const fillPartner = (column: GroupColorColumn, value: string): void => {
    if (!HEX_COLOR.test(value)) return;
    const partner = PARTNER[column];
    const current = getValues(partner);
    if (current !== '' && current !== filled.current[partner]) return;
    const paired = pairedColor(value, partner);
    filled.current[partner] = paired;
    setValue(partner, paired, { shouldDirty: true });
  };
  const [step, setStep] = useState<DeleteStep>({ at: 'idle' });
  const discard = useDiscardGuard(isDirty);
  const { root, history, setAlert, rootError, send } = useEntityForm({
    methods,
    discard,
    save: (input) => spec.save(input, group?.id),
    onDone,
    asking: step.at !== 'idle',
    toField: ({ path: [field, ...rest] }) =>
      rest.length === 0 && isField(field) ? field : undefined,
  });
  const [moveTo, setMoveTo] = useState('');
  const [moveError, setMoveError] = useState<string>();

  const remove = useMutation({
    mutationFn: async (target: string | undefined): Promise<void> => {
      if (!group) return;
      // No `moveTo` at all for a group holding nothing, rather than a null.
      const variables: GroupDeleteVariables = target
        ? { id: group.id, moveTo: target }
        : { id: group.id };
      await spec.remove(variables);
    },
  });

  const confirmDelete = async (target: string | undefined): Promise<void> => {
    setAlert(undefined);
    setMoveError(undefined);
    try {
      await remove.mutateAsync(target);
      onDone();
    } catch (error) {
      const issues = readGraphqlIssues(error);
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

  const others = groups.filter((each) => each.id !== group?.id);
  const rowNoun = plural(memberCount, one, many);
  const rows = `${memberCount} ${rowNoun}`;

  // The choosing step's safe answer, which takes the focus as it is asked;
  // the confirming step's are ConfirmQuestion's own.
  const cancelRef = useRef<HTMLButtonElement>(null);
  const keepGoing = () => {
    setMoveError(undefined);
    setStep({ at: 'idle' });
  };
  const cancelButton = (
    <button ref={cancelRef} type="button" className="btn btn--quiet" onClick={keepGoing}>
      Cancel
    </button>
  );

  // Each step a question over the form, keyed by the step, so each takes the focus on its
  // own safe answer as it comes.
  const choosing = (): ReactElement => {
    if (others.length === 0) {
      return (
        <ConfirmOverlay
          key="nowhere"
          question={
            <>
              &quot;{group?.name}&quot; holds {rows}, and there&apos;s no other {noun} to move them
              to. Add another {noun} first, then delete this one.
            </>
          }
          safe={cancelRef}
        >
          <div className="modal__actions">{cancelButton}</div>
        </ConfirmOverlay>
      );
    }
    const label = `Move Its ${memberCount} ${capitalise(rowNoun)} To`;
    const { aria, ...move } = fieldDescription({ id: `${id}-move`, error: moveError });
    return (
      <ConfirmOverlay key="choosing" labelledBy={move.labelId} safe={cancelRef}>
        <FieldShell label={label} {...move}>
          <ComboboxSelect
            id={move.controlId}
            label={label}
            labelId={move.labelId}
            value={moveTo}
            onChange={(value) => {
              setMoveTo(value);
              setMoveError(undefined);
            }}
            choices={others.map((each) => ({
              value: each.id,
              label: each.name,
              icon: kind === 'form' ? <FormIcon name={each.icon ?? null} /> : undefined,
            }))}
            placeholder={`Choose a ${noun}`}
            required
            {...aria}
          />
        </FieldShell>
        <div className="modal__actions">
          <button
            type="button"
            className="btn btn--solid"
            disabled={!moveTo}
            onClick={() => setStep({ at: 'confirming', moveTo })}
          >
            Continue
          </button>
          {cancelButton}
        </div>
      </ConfirmOverlay>
    );
  };

  const confirming = (target: string | undefined): ReactElement => {
    const destination = others.find((each) => each.id === target);
    // A refusal is confirmDelete's to place, at the choice or in the alert, so neither question
    // is told it.
    if (!destination) {
      return (
        <ConfirmQuestion
          key="confirming"
          question={
            <>
              Delete &quot;{group?.name}&quot;? No {many} are filed under it.
            </>
          }
          busy={remove.isPending}
          onConfirm={() => confirmDelete(undefined)}
          onKeep={keepGoing}
        />
      );
    }
    return (
      <ConfirmQuestion
        key="moving"
        question={
          <>
            Move {rows} to &quot;{destination.name}&quot; and delete &quot;{group?.name}&quot;?{' '}
            {moved}
          </>
        }
        confirmLabel="Move and Delete"
        keepLabel="Back"
        busy={remove.isPending}
        onConfirm={() => confirmDelete(destination.id)}
        onKeep={() => setStep({ at: 'choosing' })}
      />
    );
  };

  // The question over the form, if one is asked: the unsaved changes'
  // first, as they are what a way out would lose, then the delete's step.
  const question = (): ReactElement | null => {
    if (discard.asking) return <DiscardQuestion guard={discard} />;
    if (step.at === 'choosing') return choosing();
    if (step.at === 'confirming') return confirming(step.moveTo);
    return null;
  };

  return (
    <FormProvider {...methods}>
      <FormHistoryContext.Provider value={history}>
        <form
          ref={root}
          className="form"
          onSubmit={handleSubmit((input) => send(input))}
          noValidate
        >
          <FormHistoryButtons />
          {rootError && <Notice kind="error">{rootError}</Notice>}
          <FormErrorSummary />
          <TextField<GroupValues>
            name="name"
            label="Name"
            placeholder="Add a name"
            autoComplete="off"
            required
          />
          <TextField<GroupValues> name="description" label="Description" multiline required />
          {kind === 'category' &&
            COLORS.map(({ column, label, hint }) => {
              const { aria, ...shell } = fieldDescription({
                id: `${id}-${column}`,
                hint,
                error: errors[column]?.message,
              });
              // The shell draws the label and its mark, naming the hex box by `controlId`, but not the error:
              // ChipColorField places it between its ratio and its near-colour warning, so the shell's would show it twice.
              return (
                <FieldShell
                  key={column}
                  label={label}
                  hint={hint}
                  required
                  {...shell}
                  error={undefined}
                >
                  <Controller
                    control={control}
                    name={column}
                    render={({ field }) => (
                      <ChipColorField
                        id={shell.controlId}
                        label={label}
                        column={column}
                        placeholder="#4e8bc2"
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
                        error={shell.error}
                        errorId={shell.errorId}
                        aria-required
                        {...aria}
                      />
                    )}
                  />
                </FieldShell>
              );
            })}
          {kind === 'form' && (
            <Controller
              control={control}
              name="icon"
              render={({ field }) => (
                <RadioGroupField<FormGroupIcon | ''>
                  legend="Icon"
                  layout="strip"
                  name={`${id}-icon`}
                  options={ICONS}
                  value={field.value}
                  onChange={field.onChange}
                  note="The icon drawn beside each form in this group. None draws the generic one."
                />
              )}
            />
          )}
          <FormActions
            noun={title}
            dirty={isDirty}
            submitting={isSubmitting}
            onCancel={() => discard.request(onDone)}
            onDelete={
              group &&
              (() => {
                setAlert(undefined);
                setStep(memberCount > 0 ? { at: 'choosing' } : { at: 'confirming' });
              })
            }
          />
          {question()}
        </form>
      </FormHistoryContext.Provider>
    </FormProvider>
  );
};

export default GroupForm;
