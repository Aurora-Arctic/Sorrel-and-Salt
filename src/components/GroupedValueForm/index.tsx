'use client';

import { zodResolver } from '@hookform/resolvers/zod';

import { useMutation } from '@tanstack/react-query';
import { type ReactElement, useId, useRef, useState } from 'react';
import { FormProvider, type Resolver, useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
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
import { ListField } from '../IngredientForm/fields';
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

// The admin's form for a curated value, grouped (category, ingredient form, deity) or flat (celestial
// body, zodiac sign): a name, a description and, if grouped, the group, validated by the shared schema
// and the service. No rename moves an entry's address (claude-docs/components/grouped-value-form.md).

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

const EMPTY: GroupedValueValues = {
  name: '',
  description: '',
  groupId: '',
  folkNames: [],
  drafts: { folkNames: '' },
};

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
 * What a curated value's delete leaves behind, for each kind a compendium entry uses: picked (a form, a
 * deity) or listed (a body, a sign). A coven's ingredient that wrote the value keeps it as its own.
 */
const USED_DELETE_NOTE =
  "You can't delete it while a compendium entry uses it. Covens' ingredients keep what they wrote, as their own value.";

/** What saving a renamed value does, for every kind a compendium entry uses. */
const USED_RENAME_NOTE = 'Saving renames it on every compendium entry that uses it.';

/**
 * What a description is for, on the kinds whose suggestions match it as well
 * as the name (src/modules/vocabulary/services/suggestions.ts).
 */
const SEARCHED_DESCRIPTION_HINT =
  "What it is, in the words a reader reaches for. The ingredient form's suggestions match it as well as the name.";

/** A grouped kind's input, where it calls the group `groupId` too: the other names it never shows are left out. */
const withGroup = ({ name, description, groupId }: GroupedValueValues) => ({
  name,
  description,
  groupId,
});

/** A flat kind's input is its name and description: the group field it never shows is left out. */
const withoutGroup = ({ name, description }: GroupedValueValues) => ({ name, description });

/**
 * What differs between the vocabularies: copy, schema, input and mutations. A kind whose input names
 * the group otherwise maps it with `inputKeys` and `toInput`; a flat kind has no group.
 */
const KINDS: Record<GroupedValueKind, GroupedValueFormKind> = {
  category: defineKind({
    noun: LIST_KINDS.category.label,
    // No Description tip: its label and placeholder say it. The searched kinds keep
    // theirs, a flow.
    describe: 'What this category covers',
    group: {
      label: 'Group',
      placeholder: 'Choose a group',
    },
    // Deleting a category removes nothing of a coven's: an entry filed under it keeps its
    // link and stops reading the category, so the entry stays in its list and only the
    // filter loses the category.
    deleteNote:
      "Covens' ingredients and spells filed under it stay in their lists, but can no longer be filtered by it.",
    schema: CategoryInput,
    toInput: withGroup,
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
    },
    deleteNote: USED_DELETE_NOTE,
    // A rename carries onto every compendium entry that picked the form, though no
    // entry's address moves: a form is no part of one.
    renameNote: USED_RENAME_NOTE,
    schema: IngredientFormValueInput,
    toInput: withGroup,
    create: CreateIngredientFormValueDocument,
    update: UpdateIngredientFormValueDocument,
    remove: DeleteIngredientFormValueDocument,
  }),
  deity: defineKind({
    noun: LIST_KINDS.deity.label,
    describe: 'Who they are and what they are honoured for',
    descriptionHint:
      "Who they are, in the words a reader reaches for. The ingredient form's suggestions match it as well as the name; the other names they go by are Other Names.",
    otherNamesHint:
      "The other names and spellings a source calls them by, such as Hekate. The ingredient form's suggestions find them by these, and the compendium seed links a source's name to them.",
    group: {
      label: 'Tradition',
      placeholder: 'Choose a tradition',
      hint: 'The people or religion that honours them. A god several honour is filed under one, and the description names the others.',
    },
    deleteNote: USED_DELETE_NOTE,
    // A rename carries onto every compendium entry that picked the deity, though no
    // entry's address moves: a deity is no part of one.
    renameNote: USED_RENAME_NOTE,
    // The input calls the group its tradition, and the other names
    // `otherNames`; the form's fields stay `groupId` and `folkNames`, a
    // list of entries as ListField keeps one (GroupedValueValues says why).
    inputKeys: { groupId: 'traditionId' },
    schema: DeityInput.omit({ traditionId: true, otherNames: true }).extend({
      groupId: DeityInput.shape.traditionId,
      folkNames: z.array(z.object({ value: z.string().trim() })),
    }),
    toInput: ({ name, description, groupId, folkNames }) => ({
      name,
      description,
      traditionId: groupId,
      otherNames: folkNames.map(({ value }) => value),
    }),
    create: CreateDeityDocument,
    update: UpdateDeityDocument,
    remove: DeleteDeityDocument,
  }),
  // The flat kinds: filed under nothing, and no part of an entry's address, so a rename
  // moves none; it still carries onto the entries listing the value.
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
    // The long form on every button: Save Zodiac Sign.
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
      ? {
          ...EMPTY,
          name: value.name,
          description: value.description,
          groupId: value.groupId ?? '',
          folkNames: (value.otherNames ?? []).map((name) => ({ value: name })),
        }
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
  // Cancel, and every other way out of the modal, asks first while the form has changes;
  // a save or a delete does not.
  const discard = useDiscardGuard(isDirty);
  // Undo and redo, off while a question is up over the form.
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
      // An other name's refusal, `['otherNames', 2]`, lands on that entry.
      placeServerIssues(error, setError, ({ path: [key, ...rest] }) => {
        if (key === 'otherNames' && typeof rest[0] === 'number') {
          return `folkNames.${rest[0]}.value` as const;
        }
        return rest.length === 0 ? fieldOf(spec, key) : undefined;
      });
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
          {spec.otherNamesHint && (
            <ListField
              name="folkNames"
              legend="Other Names"
              entry="Other Name"
              placeholder="Add a name"
              hint={spec.otherNamesHint}
            />
          )}
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
              // Typed into to narrow the groups.
              typeahead
              required
            />
          )}
          {actions()}
          {/* A question over the form, its buttons left beneath it: the unsaved changes'
                      first, then the delete's. */}
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
