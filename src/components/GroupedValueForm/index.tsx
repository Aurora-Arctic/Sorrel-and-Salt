'use client';

import { zodResolver } from '@hookform/resolvers/zod';

import { useMutation } from '@tanstack/react-query';
import { type ReactElement, useId, useRef, useState } from 'react';
import { FormProvider, type Resolver, useForm, useWatch } from 'react-hook-form';
import { graphql } from '../../gql';
import { graphqlRequest, saveRequest } from '../../lib/graphql-client';
import { placeServerIssues } from '../../lib/graphql-failure';
import { KINDS as LIST_KINDS } from '../GroupedValueList/kinds';
import { ConfirmQuestion, useDiscardGuard } from '../Modal';
import FormIcon from '../FormIcon';
import {
  FormActions,
  FormHistoryButtons,
  FormHistoryContext,
  SelectField,
  TextField,
  useFormHistory,
} from '../Field';
import Notice from '../Notice';
import {
  CelestialBodyInput,
  ZodiacSignInput,
} from '@/modules/vocabulary/validation/astrology-value';
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

// The admin's form for a curated value: grouped — a category (M5.6), an
// ingredient form (M5.6a) or a deity (MB.132) — or flat where the kind has no
// group, a celestial body or a zodiac sign (MB.95). One for every such vocabulary, as
// GroupForm is for their groups, so a new one is a `KINDS` entry rather than
// another copy (MB.132; the flat kinds folded in at MB.115): a name, a
// description and, for a grouped kind, the group it is filed under,
// validated by the shared schema before the mutation and again by the
// service, and on an existing value a delete behind a confirmation. A kind
// whose rename reaches further than its row says so (MB.162). No rename here
// moves a compendium entry's address since MB.220, so none asks to end a
// redirect. It holds no modal of its own; the page puts it in one
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

const CreateCelestialBodyDocument = graphql(`
  mutation CreateCelestialBody($input: CelestialBodyInput!) {
    createCelestialBody(input: $input) {
      id
    }
  }
`);

const UpdateCelestialBodyDocument = graphql(`
  mutation UpdateCelestialBody($id: ID!, $input: CelestialBodyInput!) {
    updateCelestialBody(id: $id, input: $input) {
      id
    }
  }
`);

const DeleteCelestialBodyDocument = graphql(`
  mutation DeleteCelestialBody($id: ID!) {
    deleteCelestialBody(id: $id)
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

const FIELDS = ['name', 'description', 'groupId'] as const;
type FieldName = (typeof FIELDS)[number];

const EMPTY: GroupedValueValues = { name: '', description: '', groupId: '' };

/**
 * A kind as the form uses it, from its declaration: the input type stays
 * inside, so `KINDS` can hold kinds whose inputs differ — one that calls the
 * group `traditionId`, or one with no group — without a cast at each request.
 */
function defineKind<Input extends object>({
  schema,
  toInput,
  create,
  update,
  remove,
  ...copy
}: GroupedValueKindSpec<Input>): GroupedValueFormKind {
  const send = saveRequest(create, update);
  return {
    ...copy,
    // The form's values always carry `groupId`, `''` for a flat kind, whose
    // schema parses them without it; the resolver is typed for the values.
    resolver: zodResolver(schema) as unknown as Resolver<GroupedValueValues>,
    save: (values, id) => send(toInput(values), id),
    remove: async (id) => {
      await graphqlRequest(remove, { id });
    },
  };
}

/**
 * What a curated value's delete leaves behind, for every kind a compendium
 * entry uses: picked, as a form or a deity is, or listed, as a celestial body or a
 * zodiac sign is. A coven's ingredient that wrote the value keeps it, as a
 * value of its own rather than a curated one.
 */
const USED_DELETE_NOTE =
  "You can't delete it while a compendium entry uses it. Covens' ingredients keep what they wrote, as their own value.";

/** What saving a renamed value does, for every kind a compendium entry uses (MB.162). */
const USED_RENAME_NOTE = 'Saving renames it on every compendium entry that uses it.';

/**
 * What a description is for, on the kinds whose suggestions match it as well
 * as the name (src/modules/vocabulary/services/suggestions.ts).
 */
const SEARCHED_DESCRIPTION_HINT =
  "What it is, in the words a reader reaches for. The ingredient form's suggestions match it as well as the name.";

/** A flat kind's input is its name and description: the group field it never shows is left out. */
const withoutGroup = ({ name, description }: GroupedValueValues) => ({ name, description });

/**
 * What differs between the vocabularies: their copy, their schema and input,
 * and their mutations. A kind whose input names the group otherwise maps it
 * back with `inputKeys` and `toInput`; the category and form inputs are the
 * values themselves, and a flat kind has no group at all.
 */
const KINDS: Record<GroupedValueKind, GroupedValueFormKind> = {
  category: defineKind({
    noun: LIST_KINDS.category.label,
    describe: 'What this category covers',
    descriptionHint:
      "What the category covers. It is shown with the category wherever an ingredient's categories are picked.",
    group: {
      label: 'Group',
      placeholder: 'Choose a group',
      hint: "The family it is filed under. Its chip wears the group's colours.",
    },
    // Deleting a category removes nothing of a coven's: an entry filed under
    // it keeps its link and stops reading the category, so the entry stays in
    // its list and only the filter loses the category (the MB.115 sign-off).
    deleteNote:
      "Covens' ingredients and spells filed under it stay in their lists, but can no longer be filtered by it.",
    schema: CategoryInput,
    toInput: (values) => values,
    create: CreateCategoryDocument,
    update: UpdateCategoryDocument,
    remove: DeleteCategoryDocument,
  }),
  form: defineKind({
    noun: LIST_KINDS.form.label,
    // A curated form explains itself: "the bark of the root, not the stem" (DESIGN.md §5).
    describe: 'What this form is, and what it is not',
    descriptionHint: SEARCHED_DESCRIPTION_HINT,
    group: {
      label: 'Group',
      placeholder: 'Choose a group',
      hint: "What kind of thing it is. The ingredient form's suggestions list the forms under their groups.",
    },
    deleteNote: USED_DELETE_NOTE,
    // A rename carries onto every compendium entry that picked the form
    // (MB.162), though no entry's address moves: a form is no part of one
    // since MB.220.
    renameNote: USED_RENAME_NOTE,
    schema: IngredientFormValueInput,
    toInput: (values) => values,
    create: CreateIngredientFormValueDocument,
    update: UpdateIngredientFormValueDocument,
    remove: DeleteIngredientFormValueDocument,
  }),
  deity: defineKind({
    noun: LIST_KINDS.deity.label,
    describe: 'Who they are and what they are honoured for',
    descriptionHint:
      "Who they are, with the other spellings a reader types, such as Hekate. The ingredient form's suggestions match it as well as the name.",
    group: {
      label: 'Tradition',
      placeholder: 'Choose a tradition',
      hint: 'The people or religion that honours them. A god several honour is filed under one, and the description names the others.',
    },
    deleteNote: USED_DELETE_NOTE,
    // A rename carries onto every compendium entry that picked the deity
    // (MB.162), though no entry's address moves: a deity is no part of one.
    renameNote: USED_RENAME_NOTE,
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
  // The flat kinds (MB.95): filed under nothing, and no part of an entry's
  // address, so a rename moves none; it still carries onto the entries
  // listing the value (MB.162).
  celestialBody: defineKind({
    noun: LIST_KINDS.celestialBody.label,
    describe: 'What this body is, and the other names it goes by',
    descriptionHint: SEARCHED_DESCRIPTION_HINT,
    deleteNote: USED_DELETE_NOTE,
    renameNote: USED_RENAME_NOTE,
    schema: CelestialBodyInput,
    toInput: withoutGroup,
    create: CreateCelestialBodyDocument,
    update: UpdateCelestialBodyDocument,
    remove: DeleteCelestialBodyDocument,
  }),
  zodiacSign: defineKind({
    // The long form on every button (the MB.115 sign-off): Save Zodiac Sign.
    noun: LIST_KINDS.zodiacSign.label,
    describe: 'What this sign is, and the other names it goes by',
    descriptionHint: SEARCHED_DESCRIPTION_HINT,
    deleteNote: USED_DELETE_NOTE,
    renameNote: USED_RENAME_NOTE,
    schema: ZodiacSignInput,
    toInput: withoutGroup,
    create: CreateZodiacSignDocument,
    update: UpdateZodiacSignDocument,
    remove: DeleteZodiacSignDocument,
  }),
};

/** The field an input key names, under the kind's own name for it where it has one. */
const fieldOf = ({ inputKeys }: GroupedValueFormKind, key: unknown): FieldName | undefined =>
  FIELDS.find((field) => (inputKeys?.[field] ?? field) === key);

const GroupedValueForm = ({
  kind,
  value,
  groups = [],
  onDone,
}: GroupedValueFormProps): ReactElement => {
  const id = useId();
  const spec = KINDS[kind];
  const { noun, group, deleteNote, renameNote } = spec;
  const methods = useForm<GroupedValueValues>({
    defaultValues: value
      ? { name: value.name, description: value.description, groupId: value.groupId ?? '' }
      : EMPTY,
    resolver: spec.resolver,
  });
  const {
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting, isDirty },
  } = methods;
  const [confirming, setConfirming] = useState(false);
  // Cancel, and every other way out of the modal, asks first while the form
  // has changes (MB.115, the owner's call); a save or a delete does not.
  const discard = useDiscardGuard(isDirty);
  // Undo and redo (M12.9), off while a question is up over the form.
  const root = useRef<HTMLFormElement>(null);
  const history = useFormHistory(methods, { root, enabled: !discard.asking && !confirming });
  const [alert, setAlert] = useState<string>();
  const name = useWatch({ control, name: 'name' });
  // Trimmed, as the schema trims: a space added to the end renames nothing.
  const renamed =
    renameNote !== undefined && value !== undefined && (name ?? '').trim() !== value.name;

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
      placeServerIssues(error, setError, ({ path: [key, ...rest] }) =>
        rest.length === 0 ? fieldOf(spec, key) : undefined,
      );
    }
  };

  const confirmDelete = async (): Promise<void> => {
    if (!value) return;
    setAlert(undefined);
    await remove.mutateAsync(value.id);
    onDone();
  };

  const choices = groups.map((each) => ({
    value: each.id,
    label: each.name,
    // Only a form group has an icon; one with none shows the generic.
    icon: kind === 'form' ? <FormIcon name={each.icon ?? null} /> : undefined,
  }));
  const rootError = errors.root?.message ?? alert;
  const noteId = `${id}-rename-note`;

  const actions = (): ReactElement => (
    <>
      {/* Before Save is pressed rather than after: a kind whose rename
            reaches past its row says so while the name differs. */}
      {renamed && (
        <p id={noteId} className="field__hint grouped-value-form__note">
          {renameNote}
        </p>
      )}
      <FormActions
        noun={noun}
        dirty={isDirty}
        submitting={isSubmitting}
        saveDescribedBy={renamed ? noteId : undefined}
        onCancel={() => discard.request(onDone)}
        onDelete={
          value &&
          (() => {
            setAlert(undefined);
            setConfirming(true);
          })
        }
      />
    </>
  );

  return (
    <FormProvider {...methods}>
      <FormHistoryContext.Provider value={history}>
        <form
          ref={root}
          className="form grouped-value-form"
          onKeyDown={history.onKeyDown}
          onSubmit={handleSubmit((input) => send(input))}
          noValidate
        >
          <FormHistoryButtons />
          {rootError && <Notice kind="error">{rootError}</Notice>}
          {/* Autofill off: Chrome takes a field named "name" for a person's and
            offers the user's own. */}
          <TextField<GroupedValueValues>
            name="name"
            label="Name"
            placeholder="Add a name"
            autoComplete="off"
            required
          />
          <TextField<GroupedValueValues>
            name="description"
            label="Description"
            hint={spec.descriptionHint}
            placeholder={spec.describe}
            multiline
            required
          />
          {group && (
            <SelectField<GroupedValueValues>
              name="groupId"
              label={group.label}
              hint={group.hint}
              placeholder={group.placeholder}
              options={choices}
              // Typed into to narrow the groups, the owner's call (MB.115).
              typeahead
              required
            />
          )}
          {actions()}
          {/* A question over the form, its buttons left beneath it (MB.115,
            the owner's call): the unsaved changes' first, then the delete's. */}
          <ConfirmQuestion
            guard={discard}
            asked={confirming}
            question={
              <>
                Delete &quot;{value?.name}&quot;? {deleteNote}
              </>
            }
            busy={remove.isPending}
            onConfirm={confirmDelete}
            onKeep={() => setConfirming(false)}
            onRefused={(refusal) => {
              setConfirming(false);
              setAlert(refusal);
            }}
          />
        </form>
      </FormHistoryContext.Provider>
    </FormProvider>
  );
};

export default GroupedValueForm;
