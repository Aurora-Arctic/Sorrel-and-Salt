'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { type ReactElement, type ReactNode, useRef, useState } from 'react';
import { FormProvider, type Resolver, useForm, useWatch } from 'react-hook-form';
import { CollapsibleSection, FoldAll } from '../CollapsibleSection';
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
import { SpellCategoriesField, sameCategories, useCategoryName } from './categories-field';
import { DAYS_OF_THE_WEEK, MOON_PHASES } from './constants';
import { useSaveOnClose } from './save-on-close';
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

// The spell builder (M10.12): a spell's title, intent, jar and note, in a
// modal over the grimoire (./spell-dialog.tsx), opened empty by New Spell and
// on a saved spell by its Edit. Its fields sit in four folding sections, as
// Add Ingredient's do: open on a new spell, shut on a saved one, each shut
// line naming what it holds, and Open All / Close All in the dialog's head. Moon phase and day of the week suggest a
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
      jarDescription
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
      jarDescription
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
  'jarDescription',
  'sealWaxColor',
  'moonPhase',
  'dayOfWeek',
  'note',
];

/** A value the form holds, which a section folds. */
type SectionField = keyof SpellBuilderValues;

/**
 * The builder's sections, in order, and the values each folds: what flags a
 * section holding an error, and what its shut line reads. Later fields join
 * these: M10.15's steps Jar.
 */
const SECTIONS = {
  Purpose: ['title', 'intent', 'categoryIds'],
  Jar: ['jarDescription', 'sealWaxColor'],
  'When to Work It': ['moonPhase', 'dayOfWeek'],
  Notes: ['note', 'visibility'],
} as const satisfies Record<string, readonly SectionField[]>;

type SectionName = keyof typeof SECTIONS;

const SECTION_NAMES = Object.keys(SECTIONS) as SectionName[];

/** A value as one line: a multi-line intent or note reads on a shut section's line. */
const oneLine = (text: string): string => text.trim().replace(/\s+/g, ' ');

/**
 * A value as its shut section's line reads it, blank for none: the
 * categories by name, as the picker's chips read (`named`), each once the
 * categories are read, so the line never shows an id.
 */
function lineOfField(
  field: SectionField,
  values: SpellBuilderValues,
  named: (id: string) => string | undefined,
): string {
  switch (field) {
    case 'categoryIds':
      return (values.categoryIds ?? []).flatMap((id) => named(id) ?? []).join(', ');
    case 'visibility':
      return values.visibility === 'workspace' ? 'Shared' : 'Private';
    default:
      return oneLine(values[field] ?? '');
  }
}

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
    categoryIds: [...(spell?.categoryIds ?? [])],
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
  // blank and spaces alike reading as none, as the schema reads them, or a
  // visibility other than the last save's, which is a choice worth saving on
  // its own (the owner's call, 2026-10-27).
  const typed = useWatch({ control, name: [...FIELDS] });
  const picked = useWatch({ control, name: 'categoryIds' });
  const categoriesChanged = !sameCategories(picked, defaultValues?.categoryIds);
  const visibility = useWatch({ control, name: 'visibility' });
  const values = useWatch({ control }) as SpellBuilderValues;
  const categoryName = useCategoryName();
  const dirty =
    categoriesChanged ||
    visibility !== defaultValues?.visibility ||
    FIELDS.some(
      (field, index) => (typed[index] ?? '').trim() !== (defaultValues?.[field] ?? '').trim(),
    );

  // A new spell opens every section, to be filled in order; a saved one opens
  // them shut, each line saying what it holds, as Add Ingredient's do (M8.16).
  const [open, setOpen] = useState<ReadonlySet<SectionName>>(
    () => new Set(spell ? [] : SECTION_NAMES),
  );
  const toggle = (name: SectionName) =>
    setOpen((was) => {
      const next = new Set(was);
      if (!next.delete(name)) next.add(name);
      return next;
    });
  const lineOf = (name: SectionName): string =>
    SECTIONS[name]
      .map((field) => lineOfField(field, values, categoryName))
      .filter(Boolean)
      .join(' · ') || 'Nothing yet';
  /** Opens each section one of whose fields now holds an error, so the error is seen. */
  const openErred = () => {
    const erred = SECTION_NAMES.filter((name) =>
      SECTIONS[name].some((field) => methods.getFieldState(field).invalid),
    );
    if (erred.length > 0) setOpen((was) => new Set([...was, ...erred]));
  };
  /** A section, folding its fields, flagged while one of them holds an error. */
  const section = (name: SectionName, children: ReactNode): ReactElement => (
    <CollapsibleSection
      title={name}
      summary={lineOf(name)}
      fold={{
        open: open.has(name),
        invalid: SECTIONS[name].some((field) => errors[field] !== undefined),
        onToggle: () => toggle(name),
      }}
    >
      {children}
    </CollapsibleSection>
  );

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
    const input: SpellBuilderInput = {
      ...(Object.fromEntries(FIELDS.map((field) => [field, values[field] ?? null])) as Record<
        SpellBuilderField,
        string | null
      >),
      visibility: values.visibility,
    };
    // The categories go only when the picks differ from the last save: left
    // out, the service keeps the spell's set as it is (M10.14).
    const categoryIds = values.categoryIds ?? [];
    if (!sameCategories(categoryIds, defaultValues?.categoryIds)) input.categoryIds = categoryIds;
    try {
      const created = saved === null;
      const answer = await save.mutateAsync(input);
      setSaved({ id: answer.id, revision: answer.revision });
      // What was saved is the new start: Save goes off until the next change.
      reset({ ...valuesOf(answer), categoryIds });
      // A Close waiting on this save closes now, and leaves the address be.
      if (closeGuard.saved()) return;
      if (created) onCreated?.(answer);
    } catch (error) {
      closeGuard.refused();
      placeServerIssues(error, setError, ({ path: [field, ...rest] }) => {
        // A refused pick is pathed to its index, as the ids were sent.
        if (field === 'categoryIds') {
          return rest.length === 0 ? 'categoryIds' : `categoryIds.${Number(rest[0])}`;
        }
        return rest.length === 0 && isField(field) ? field : undefined;
      });
      openErred();
    }
  };

  const submit = handleSubmit(send, () => {
    closeGuard.refused();
    openErred();
  });
  const closeGuard = useSaveOnClose(dirty, isSubmitting, () => void submit());

  return (
    <FormProvider {...methods}>
      <FormHistoryContext.Provider value={history}>
        <form ref={root} className="form spell-builder" onSubmit={submit} noValidate>
          {errors.root?.message && <Notice kind="error">{errors.root.message}</Notice>}
          <div className="collapsible-sections">
            <FoldAll
              anyOpen={open.size > 0}
              onToggle={() => setOpen(open.size > 0 ? new Set() : new Set(SECTION_NAMES))}
            />
            <FormHistoryButtons />
            {section(
              'Purpose',
              <>
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
                <SpellCategoriesField />
              </>,
            )}
            {section(
              'Jar',
              <>
                <TextField<SpellBuilderValues>
                  name="jarDescription"
                  label="Jar Description"
                  placeholder="Add a description"
                  autoComplete="off"
                />
                <TextField<SpellBuilderValues>
                  name="sealWaxColor"
                  label="Seal Wax Colour"
                  placeholder="Add a colour"
                  autoComplete="off"
                />
              </>,
            )}
            {/* The recipe's timing: when to work the spell, not when it was worked,
                which a working's own date gives (M13.4). */}
            {section(
              'When to Work It',
              <>
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
              </>,
            )}
            {section(
              'Notes',
              <>
                <TextField<SpellBuilderValues>
                  name="note"
                  label="Note"
                  placeholder="Add a note"
                  multiline
                />
                <SpellVisibilityField created={saved !== null} save={send} />
              </>,
            )}
          </div>
          <FormActions noun="Spell" dirty={dirty} submitting={isSubmitting} />
        </form>
      </FormHistoryContext.Provider>
    </FormProvider>
  );
};

export default SpellBuilder;
