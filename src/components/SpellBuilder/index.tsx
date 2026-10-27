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
import MoonPhaseIcon from '../MoonPhaseIcon';
import Notice from '../Notice';
import { DAYS_OF_THE_WEEK, MOON_PHASES } from './constants';
import { SpellSuggestField } from './suggest-field';
import { SpellInput } from '@/modules/grimoire/validation/spell';
import { SpellVisibilityField } from './visibility-field';
import type {
  SpellBuilderField,
  SpellBuilderInput,
  SpellBuilderProps,
  SpellBuilderSpell,
  SpellBuilderValues,
} from './types';
import './index.scss';

// The spell builder (M10.12): a spell's title, intent, jar and note, on the
// new-spell page now and on the edit page once M13.10 opens it with a saved
// spell. Moon phase and day of the week suggest a fixed list and still take
// what is typed (./constants). No field is required: a draft may be saved
// with any of them, and a title is asked for only when the spell is marked
// complete (M10.20). Save creates the spell once and the builder then holds
// its id and revision, so every later Save updates that spell, as the
// autosave adapter will (claude-docs/design-decisions/m13.14-plan.md). A Back
// link on the page, not Cancel, leaves it. See claude-docs/components/spell-builder.md.

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
      visibility
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
      visibility
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

const isField = (key: unknown): key is SpellBuilderField =>
  FIELDS.includes(key as SpellBuilderField);

/** The form's values for a spell: none for a new one, and blank for a field it has not set. */
function valuesOf(spell?: Partial<SpellBuilderSpell>): SpellBuilderValues {
  return {
    ...(Object.fromEntries(FIELDS.map((field) => [field, spell?.[field] ?? ''])) as Record<
      SpellBuilderField,
      string
    >),
    // A new spell is the coven's unless chosen otherwise (§5).
    visibility: spell?.visibility ?? 'workspace',
  };
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

// A moon phase's drawing beside its name, null for a phase typed outside
// the list so the box draws no empty mark. Module-level so the field's
// suggestions are not rebuilt each render.
const moonPhaseIcon = (phase: string): ReactElement | null =>
  (MOON_PHASES as readonly string[]).includes(phase) ? <MoonPhaseIcon phase={phase} /> : null;

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
    const input = {
      ...(Object.fromEntries(FIELDS.map((field) => [field, values[field] ?? null])) as Record<
        SpellBuilderField,
        string | null
      >),
      visibility: values.visibility,
    };
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
        <form ref={root} className="form spell-builder" onSubmit={handleSubmit(send)} noValidate>
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
          {/* The recipe's timing: when to work the spell, not when it was worked,
              which a working's own date gives (M13.4). The shared .fieldset
              primitive, so the legend names the group to a screen reader. */}
          <fieldset className="fieldset">
            <legend className="fieldset__legend">When to Work It</legend>
            <SpellSuggestField
              name="moonPhase"
              label="Moon Phase"
              placeholder="Add a phase"
              options={MOON_PHASES}
              icon={moonPhaseIcon}
            />
            <SpellSuggestField
              name="dayOfWeek"
              label="Day of the Week"
              placeholder="Add a day"
              options={DAYS_OF_THE_WEEK}
            />
          </fieldset>
          <TextField<SpellBuilderValues>
            name="note"
            label="Note"
            placeholder="Add a note"
            multiline
          />
          <SpellVisibilityField created={saved !== null} save={send} />
          <FormActions noun="Spell" dirty={dirty} submitting={isSubmitting} />
          {discard.asking && <DiscardQuestion guard={discard} />}
        </form>
      </FormHistoryContext.Provider>
    </FormProvider>
  );
};

export default SpellBuilder;
