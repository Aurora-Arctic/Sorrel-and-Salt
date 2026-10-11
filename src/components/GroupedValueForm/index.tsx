'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import type { TypedDocumentNode } from '@graphql-typed-document-node/core';
import { useMutation } from '@tanstack/react-query';
import { type ReactElement, useId, useState } from 'react';
import { FormProvider, type Resolver, useForm, useWatch } from 'react-hook-form';
import { graphql } from '../../gql';
import { graphqlRequest } from '../../lib/graphql-client';
import { GENERIC_FAILURE, readGraphqlIssues } from '../../lib/graphql-failure';
import BusyButton from '../BusyButton';
import { SelectField, TextField } from '../Field';
import Notice from '../Notice';
import { PlanetInput, ZodiacSignInput } from '@/modules/vocabulary/validation/astrology-value';
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
// group, a planet or a zodiac sign (MB.95). One for every such vocabulary, as
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
  return {
    ...copy,
    // The form's values always carry `groupId`, `''` for a flat kind, whose
    // schema parses them without it; the resolver is typed for the values.
    resolver: zodResolver(schema) as unknown as Resolver<GroupedValueValues>,
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
 * What a curated value's delete leaves behind, for every kind a compendium
 * entry uses: picked, as a form or a deity is, or listed, as a planet or a
 * zodiac sign is. A coven's ingredient that wrote the value keeps it, as a
 * value of its own rather than a curated one.
 */
const USED_DELETE_NOTE =
  "You can't delete it while a compendium entry uses it. Covens' ingredients keep what they wrote, as their own value.";

/** What saving a renamed value does, for every kind a compendium entry uses (MB.162). */
const USED_RENAME_NOTE = 'Saving renames it on every compendium entry that uses it.';

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
    noun: 'Category',
    group: { label: 'Group', placeholder: 'Choose a group' },
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
    noun: 'Form',
    group: { label: 'Group', placeholder: 'Choose a group' },
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
    noun: 'Deity',
    // Typed into to narrow the traditions, the owner's call (MB.115).
    group: { label: 'Tradition', placeholder: 'Choose a tradition', typeahead: true },
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
  planet: defineKind({
    noun: 'Planet',
    deleteNote: USED_DELETE_NOTE,
    renameNote: USED_RENAME_NOTE,
    schema: PlanetInput,
    toInput: withoutGroup,
    create: CreatePlanetDocument,
    update: UpdatePlanetDocument,
    remove: DeletePlanetDocument,
  }),
  zodiacSign: defineKind({
    // The long form on every button (the MB.115 sign-off): Save Zodiac Sign.
    noun: 'Zodiac Sign',
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

  const choices = groups.map((each) => ({ value: each.id, label: each.name }));
  const rootError = errors.root?.message ?? alert;
  const noteId = `${id}-rename-note`;

  const actions = (): ReactElement => {
    if (confirming) {
      return (
        <div className="form__confirm">
          <p>
            Delete &quot;{value?.name}&quot;? {deleteNote}
          </p>
          <div className="modal__actions">
            <BusyButton
              className="btn btn--destructive"
              disabled={remove.isPending}
              busy={remove.isPending}
              busyLabel="Deleting"
              onClick={() => void confirmDelete()}
            >
              Delete
            </BusyButton>
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
        <div className="form__actions">
          {/* Offered only when there is something to save — nothing typed on a
              new value, nothing changed on an existing one — the owner's rule
              for every form; and busy, saying so, from the press to the
              answer. */}
          <BusyButton
            type="submit"
            className="btn btn--solid"
            disabled={!isDirty || isSubmitting}
            busy={isSubmitting}
            busyLabel={`Saving ${noun}`}
            aria-describedby={renamed ? noteId : undefined}
          >
            Save {noun}
          </BusyButton>
          <button type="button" className="btn btn--quiet" onClick={onDone}>
            Cancel
          </button>
          {value && (
            <button
              type="button"
              className="btn btn--destructive form__aside"
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
    <FormProvider {...methods}>
      <form
        className="form grouped-value-form"
        onSubmit={handleSubmit((input) => send(input))}
        noValidate
      >
        {rootError && <Notice kind="error">{rootError}</Notice>}
        {/* Autofill off: Chrome takes a field named "name" for a person's and
            offers the user's own. */}
        <TextField<GroupedValueValues> name="name" label="Name" autoComplete="off" required />
        <TextField<GroupedValueValues> name="description" label="Description" multiline required />
        {group && (
          <SelectField<GroupedValueValues>
            name="groupId"
            label={group.label}
            placeholder={group.placeholder}
            options={choices}
            typeahead={group.typeahead}
            required
          />
        )}
        {actions()}
      </form>
    </FormProvider>
  );
};

export default GroupedValueForm;
