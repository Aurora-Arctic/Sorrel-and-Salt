'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { type ReactElement, useRef, useState } from 'react';
import { FormProvider, type Resolver, useForm, useWatch } from 'react-hook-form';
import { CollapsibleSection } from '../CollapsibleSection';
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
import MoonPhaseIcon from '../MoonPhaseIcon';
import Notice from '../Notice';
import { DAYS_OF_THE_WEEK, MOON_PHASES } from './constants';
import { useSaveOnClose } from './save-on-close';
import { SpellSuggestField } from './suggest-field';
import { SpellInput } from '@/modules/grimoire/validation/spell';
import type {
  SpellBuilderField,
  SpellBuilderProps,
  SpellBuilderSpell,
  SpellBuilderValues,
} from './types';

// The spell builder (M10.12): a spell's title, intent, jar and note, in a
// modal over the grimoire (./spell-dialog.tsx), opened empty by New Spell and
// on a saved spell by its Edit. Moon phase and day of the week suggest a
// fixed list and still take what is typed (./constants). No field is
// required: a draft may be saved with any of them, and a title is asked for
// only when the spell is marked complete (M10.20). Save creates the spell
// once and the builder then holds its id and revision, so every later Save
// updates that spell, as the autosave adapter will
// (claude-docs/design-decisions/m13.14-plan.md); `onCreated` hears of the
// first, so the dialog's address can become the draft's. There is no Cancel:
// Close saves what is unsaved, then closes (./save-on-close.ts). See
// claude-docs/components/spell-builder.md.

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

/** The fields When to Work It folds. */
const WHEN_FIELDS: readonly SpellBuilderField[] = ['moonPhase', 'dayOfWeek'];

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

// A moon phase's drawing beside its name, null for a phase typed outside
// the list so the box draws no empty mark. Module-level so the field's
// suggestions are not rebuilt each render.
const moonPhaseIcon = (phase: string): ReactElement | null =>
  (MOON_PHASES as readonly string[]).includes(phase) ? <MoonPhaseIcon phase={phase} /> : null;

const SpellBuilder = ({ workspaceId, spell, onCreated }: SpellBuilderProps): ReactElement => {
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

  // When to Work It opens shut, a new spell's and a saved one's alike: its line
  // says what it holds, and a save refused on one of its fields opens it.
  const [whenOpen, setWhenOpen] = useState(false);
  const whenInvalid = WHEN_FIELDS.some((field) => errors[field] !== undefined);
  const whenLine =
    WHEN_FIELDS.map((field) => (typed[FIELDS.indexOf(field)] ?? '').trim())
      .filter(Boolean)
      .join(' · ') || 'Nothing yet';
  /** Opens When to Work It when one of its fields now holds an error, so the error is seen. */
  const openWhenErred = () => {
    if (WHEN_FIELDS.some((field) => methods.getFieldState(field).invalid)) setWhenOpen(true);
  };

  const root = useRef<HTMLFormElement>(null);
  const history = useFormHistory(methods, { root });

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

  /**
   * Saves the fields; a refusal lands beside its field, or above them all.
   * The one save every way in calls: Save, Close (`useSaveOnClose`) and
   * M13.17's autosave.
   */
  const send = async (values: SpellBuilderInput): Promise<void> => {
    // Only the builder's fields: the schema's defaults (an empty recipe)
    // would otherwise replace a saved spell's steps.
    const input = Object.fromEntries(
      FIELDS.map((field) => [field, values[field] ?? null]),
    ) as SpellBuilderInput;
    try {
      const created = saved === null;
      const answer = await save.mutateAsync(input);
      setSaved({ id: answer.id, revision: answer.revision });
      // What was saved is the new start: Save goes off until the next change.
      reset(valuesOf(answer));
      // A Close waiting on this save closes now, and leaves the address be.
      if (closeGuard.saved()) return;
      if (created) onCreated?.(answer);
    } catch (error) {
      closeGuard.refused();
      placeServerIssues(error, setError, ({ path: [field, ...rest] }) =>
        rest.length === 0 && isField(field) ? field : undefined,
      );
      openWhenErred();
    }
  };

  const submit = handleSubmit(send, () => {
    closeGuard.refused();
    openWhenErred();
  });
  const closeGuard = useSaveOnClose(dirty, isSubmitting, () => void submit());

  return (
    <FormProvider {...methods}>
      <FormHistoryContext.Provider value={history}>
        <form ref={root} className="form" onSubmit={submit} noValidate>
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
              which a working's own date gives (M13.4). */}
          <CollapsibleSection
            title="When to Work It"
            summary={whenLine}
            fold={{
              open: whenOpen,
              invalid: whenInvalid,
              onToggle: () => setWhenOpen((open) => !open),
            }}
          >
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
          </CollapsibleSection>
          <TextField<SpellBuilderValues>
            name="note"
            label="Note"
            placeholder="Add a note"
            multiline
          />
          <FormActions noun="Spell" dirty={dirty} submitting={isSubmitting} />
        </form>
      </FormHistoryContext.Provider>
    </FormProvider>
  );
};

export default SpellBuilder;
