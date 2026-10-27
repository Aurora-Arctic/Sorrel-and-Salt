'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { type ReactElement, useRef, useState } from 'react';
import { FormProvider, type Resolver, useForm, useWatch } from 'react-hook-form';
import { graphql } from '../../gql';
import { graphqlRequest } from '../../lib/graphql-client';
import { placeServerIssues } from '../../lib/graphql-failure';
import {
  FormActions,
  FormHistoryButtons,
  FormHistoryContext,
  TextField,
  useFormHistory,
} from '../Field';
import { DiscardQuestion, useDiscardGuard } from '../Modal';
import Notice from '../Notice';
import { SpellInput } from '@/modules/grimoire/validation/spell';
import type {
  SpellBuilderField,
  SpellBuilderProps,
  SpellBuilderSpell,
  SpellBuilderValues,
} from './types';

// The spell builder (M10.12): a spell's title, intent, jar and note, on the
// new-spell page now and on the edit page once M13.10 opens it with a saved
// spell. No field is required: a draft may be saved with any of them, and a
// title is asked for only when the spell is marked complete (M10.20). Save
// creates the spell once and the builder then holds its id and revision, so
// every later Save updates that spell, as the autosave adapter will
// (claude-docs/design-decisions/m13.14-plan.md). A Back link on the page, not
// Cancel, leaves it. See claude-docs/components/spell-builder.md.

const CreateSpellDocument = graphql(`
  mutation CreateSpell($workspaceId: ID!, $input: SpellInput!) {
    createSpell(workspaceId: $workspaceId, input: $input) {
      id
      revision
      title
      intent
      jarSize
      sealWaxColor
      moonPhase
      dayOfWeek
      note
    }
  }
`);

const UpdateSpellDocument = graphql(`
  mutation UpdateSpell($workspaceId: ID!, $id: ID!, $input: UpdateSpellInput!) {
    updateSpell(workspaceId: $workspaceId, id: $id, input: $input) {
      id
      revision
      title
      intent
      jarSize
      sealWaxColor
      moonPhase
      dayOfWeek
      note
    }
  }
`);

const FIELDS: readonly SpellBuilderField[] = [
  'title',
  'intent',
  'jarSize',
  'sealWaxColor',
  'moonPhase',
  'dayOfWeek',
  'note',
];

/** The fields as the save sends them: trimmed, and null for blank, as the schema reads them. */
type SpellBuilderInput = Record<SpellBuilderField, string | null>;

const isField = (key: unknown): key is SpellBuilderField =>
  FIELDS.includes(key as SpellBuilderField);

/** The form's values for a spell: none for a new one, and blank for a field it has not set. */
function valuesOf(spell?: Partial<SpellBuilderSpell>): SpellBuilderValues {
  return Object.fromEntries(
    FIELDS.map((field) => [field, spell?.[field] ?? '']),
  ) as SpellBuilderValues;
}

/**
 * The shared schema's reading of the builder's fields: trimmed, and null for
 * blank, so the form sends what the service will store, and refuses what it
 * would. Only the builder's own fields are read: the recipe is M13.3's.
 */
const resolver = zodResolver(SpellInput) as unknown as Resolver<
  SpellBuilderValues,
  unknown,
  SpellBuilderInput
>;

const SpellBuilder = ({ workspaceId, spell }: SpellBuilderProps): ReactElement => {
  // The spell this builder saves to: the one it opened, else the one its first save created.
  const [saved, setSaved] = useState(spell ? { id: spell.id, revision: spell.revision } : null);
  const methods = useForm<SpellBuilderValues, unknown, SpellBuilderInput>({
    defaultValues: valuesOf(spell),
    resolver,
    // A field is checked when it is first left, and on every change after,
    // as the ingredient form's are (M5.9).
    mode: 'onTouched',
    reValidateMode: 'onChange',
  });
  const {
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting, defaultValues },
  } = methods;

  // Something to save: a field that reads differently from the last save,
  // blank and spaces alike reading as none, as the schema reads them.
  const typed = useWatch({ control, name: [...FIELDS] });
  const dirty = FIELDS.some(
    (field, index) => (typed[index] ?? '').trim() !== (defaultValues?.[field] ?? '').trim(),
  );

  const discard = useDiscardGuard(dirty && !isSubmitting);
  const root = useRef<HTMLFormElement>(null);
  const history = useFormHistory(methods, { root, enabled: !discard.asking });

  const save = useMutation({
    mutationFn: async (input: SpellBuilderInput): Promise<SpellBuilderSpell> => {
      if (saved === null) {
        const { createSpell } = await graphqlRequest(CreateSpellDocument, { workspaceId, input });
        return createSpell;
      }
      const { updateSpell } = await graphqlRequest(UpdateSpellDocument, {
        workspaceId,
        id: saved.id,
        input: { ...input, expectedRevision: saved.revision },
      });
      return updateSpell;
    },
  });

  /** Saves the fields; a refusal lands beside its field, or above them all. */
  const send = async (values: SpellBuilderInput): Promise<void> => {
    // Only the builder's fields: the schema's defaults (an empty recipe)
    // would otherwise replace a saved spell's steps.
    const input = Object.fromEntries(
      FIELDS.map((field) => [field, values[field] ?? null]),
    ) as SpellBuilderInput;
    try {
      const answer = await save.mutateAsync(input);
      setSaved({ id: answer.id, revision: answer.revision });
      // What was saved is the new start: Save goes off until the next change.
      reset(valuesOf(answer));
    } catch (error) {
      placeServerIssues(error, setError, ({ path: [field, ...rest] }) =>
        rest.length === 0 && isField(field) ? field : undefined,
      );
    }
  };

  return (
    <FormProvider {...methods}>
      <FormHistoryContext.Provider value={history}>
        <form ref={root} className="form" onSubmit={handleSubmit(send)} noValidate>
          <FormHistoryButtons />
          {errors.root?.message && <Notice kind="error">{errors.root.message}</Notice>}
          <TextField<SpellBuilderValues>
            name="title"
            label="Title"
            placeholder="Add a title"
            autoComplete="off"
          />
          <TextField<SpellBuilderValues>
            name="intent"
            label="Intent"
            placeholder="Add an intent"
            multiline
            rows={3}
          />
          <TextField<SpellBuilderValues>
            name="jarSize"
            label="Jar Size"
            placeholder="Add a size"
            autoComplete="off"
          />
          <TextField<SpellBuilderValues>
            name="sealWaxColor"
            label="Seal Wax Colour"
            placeholder="Add a colour"
            autoComplete="off"
          />
          <TextField<SpellBuilderValues>
            name="moonPhase"
            label="Moon Phase"
            placeholder="Add a phase"
            autoComplete="off"
          />
          <TextField<SpellBuilderValues>
            name="dayOfWeek"
            label="Day of the Week"
            placeholder="Add a day"
            autoComplete="off"
          />
          <TextField<SpellBuilderValues>
            name="note"
            label="Note"
            placeholder="Add a note"
            multiline
          />
          <FormActions noun="Spell" dirty={dirty} submitting={isSubmitting} />
          {discard.asking && <DiscardQuestion guard={discard} />}
        </form>
      </FormHistoryContext.Provider>
    </FormProvider>
  );
};

export default SpellBuilder;
