'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { type ReactElement, type ReactNode, useEffect, useRef, useState } from 'react';
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
import Skeleton from '../Skeleton';
import { SpellCategoriesField, sameCategories, useCategoryName } from './categories-field';
import { JarAside } from './jar-aside';
import { DAYS_OF_THE_WEEK, MOON_PHASES } from './constants';
import { useSaveOnClose } from './save-on-close';
import { SpellSteps } from './steps';
import type { SpellStepSend } from './steps/types';
import { stepInputOf, stepValueOf, stepsChanged, unitIssues } from './steps/values';
import { SpellStatusField } from './status-field';
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
      steps {
        id
        name
        form
        quantity
        unit
        note
        body
        ingredient {
          id
          toxic
          safetyNotes
          categories {
            id
            name
          }
          stock(workspaceId: $workspaceId) {
            unit
            quantityOnHand
            lowStockThreshold
            variant {
              id
            }
          }
        }
        variant {
          id
          toxic
          safetyNotes
          categories {
            id
            name
          }
          formChoice {
            group {
              icon
            }
          }
        }
      }
      visibility
      status
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
      steps {
        id
        name
        form
        quantity
        unit
        note
        body
        ingredient {
          id
          toxic
          safetyNotes
          categories {
            id
            name
          }
          stock(workspaceId: $workspaceId) {
            unit
            quantityOnHand
            lowStockThreshold
            variant {
              id
            }
          }
        }
        variant {
          id
          toxic
          safetyNotes
          categories {
            id
            name
          }
          formChoice {
            group {
              icon
            }
          }
        }
      }
      visibility
      status
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
 * these.
 */
const SECTIONS = {
  Purpose: ['title', 'intent', 'categoryIds'],
  Jar: ['jarDescription', 'sealWaxColor', 'steps'],
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
 * categories are read, so the line never shows an id; the steps as a count
 * of the ingredients laid.
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
    case 'steps': {
      // The steps that lay something: an instruction step (M13.3) has no name.
      const laid = (values.steps ?? []).filter((step) => step.name !== null).length;
      if (laid === 0) return '';
      return laid === 1 ? '1 ingredient' : `${laid} ingredients`;
    }
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
    steps: (spell?.steps ?? []).map(stepValueOf),
    // A new spell is the coven's unless chosen otherwise (§5).
    visibility: spell?.visibility ?? 'workspace',
    // A new spell is a draft (M10.20).
    status: spell?.status ?? 'draft',
    categoryIds: [...(spell?.categoryIds ?? [])],
  };
}

/**
 * The shared schema's reading of the builder's fields and steps: trimmed, and
 * null for blank, so the form sends what the service will store, and refuses
 * what it would.
 */
const schemaResolver = zodResolver(SpellInput) as unknown as Resolver<
  Omit<SpellBuilderValues, 'steps'> & { steps: SpellStepSend[] },
  unknown,
  SpellBuilderInput
>;

/**
 * The schema's reading of the steps as a save sends them, and story 77's unit
 * rule, which needs the coven's jars and so is not the schema's: a refused
 * unit is said beside it, under the step's `unit`, as the service says it.
 */
const resolver: Resolver<SpellBuilderValues, unknown, SpellBuilderInput> = async (
  values,
  context,
  options,
) => {
  const result = await schemaResolver(
    { ...values, steps: values.steps.map(stepInputOf) },
    context,
    options as unknown as Parameters<typeof schemaResolver>[2],
  );
  const issues = unitIssues(values.steps);
  if (issues.size === 0) return result as Awaited<ReturnType<typeof resolver>>;
  const errors: Record<string, unknown> = { ...result.errors };
  const steps: Record<string, unknown>[] = Array.isArray(errors.steps) ? [...errors.steps] : [];
  for (const [index, message] of issues) {
    steps[index] = { ...steps[index], unit: { type: 'unit', message } };
  }
  return { values: {}, errors: { ...errors, steps } } as Awaited<ReturnType<typeof resolver>>;
};

// A moon phase's drawing beside its name, null for a phase typed outside
// the list so the box draws no empty mark. Module-level so the field's
// suggestions are not rebuilt each render.
const moonPhaseIcon = (phase: string): ReactElement | null =>
  (MOON_PHASES as readonly string[]).includes(phase) ? <MoonPhaseIcon phase={phase} /> : null;

/** Said in the jar's place, and above the fields when a save is tried, while a saved spell's steps cannot be read. */
const STEPS_FAILED =
  "The spell's steps could not be loaded, so nothing can be saved. Reload the page to try again.";

/** Said above the fields when a save is tried before a saved spell's steps have landed. */
const STEPS_LOADING = "The spell's steps are still loading. Try again once they show.";

const SpellBuilder = ({
  workspaceId,
  spell,
  onCreated,
  stepsRead,
}: SpellBuilderProps): ReactElement => {
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
    getValues,
    setError,
    setValue,
    formState: { errors, isSubmitting, defaultValues },
  } = methods;

  // Something to save: a field that reads differently from the last save,
  // blank and spaces alike reading as none, as the schema reads them, or a
  // visibility other than the last save's, which is a choice worth saving on
  // its own (the owner's call, 2026-10-27), a changed category pick, or a
  // changed step.
  const typed = useWatch({ control, name: [...FIELDS] });
  const picked = useWatch({ control, name: 'categoryIds' });
  const categoriesChanged = !sameCategories(picked, defaultValues?.categoryIds);
  const visibility = useWatch({ control, name: 'visibility' });
  const steps = useWatch({ control, name: 'steps' });
  const values = useWatch({ control }) as SpellBuilderValues;
  const categoryName = useCategoryName();
  const dirty =
    categoriesChanged ||
    visibility !== defaultValues?.visibility ||
    FIELDS.some(
      (field, index) => (typed[index] ?? '').trim() !== (defaultValues?.[field] ?? '').trim(),
    ) ||
    stepsChanged(steps, (defaultValues?.steps ?? []) as SpellBuilderValues['steps']);
  // A unit the jar cannot be measured in holds Save, as the service would refuse it.
  const unitRefused = unitIssues(steps).size > 0;

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
        // A failed read of a saved spell's steps is the jar's error too.
        invalid:
          SECTIONS[name].some((field) => errors[field] !== undefined) ||
          (name === 'Jar' && stepsRead === 'failed'),
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
    // Steps not yet read would go out as none, and an update's steps remove the rest.
    if (!jarReady) {
      closeGuard.refused();
      setError('root', { message: stepsRead === 'failed' ? STEPS_FAILED : STEPS_LOADING });
      return;
    }
    // The fields, who can see the spell, and the whole recipe: on an update,
    // the steps sent are the spell's steps, and a saved step left out of them
    // is removed.
    const input: SpellBuilderInput = {
      ...(Object.fromEntries(FIELDS.map((field) => [field, values[field] ?? null])) as Record<
        SpellBuilderField,
        string | null
      >),
      visibility: values.visibility,
      status: values.status,
      steps: values.steps,
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
        if (rest.length === 0 && isField(field)) return field;
        // A step's amount, beside it; anything else of a step above the form.
        const [index, part] = rest;
        if (
          field === 'steps' &&
          typeof index === 'number' &&
          (part === 'quantity' || part === 'unit')
        )
          return `steps.${index}.${part}` as const;
        return undefined;
      });
      openErred();
    }
  };

  const submit = handleSubmit(send, () => {
    closeGuard.refused();
    openErred();
  });
  // A Close pressed while the steps are on their way saves once they land.
  const closeWaiting = useRef(false);
  const [jarReady, setJarReady] = useState(stepsRead === undefined);
  // Steps that could not be read leave nothing a save would take, so Close closes, unsaved.
  const closeGuard = useSaveOnClose(dirty && stepsRead !== 'failed', isSubmitting, () => {
    if (!jarReady && stepsRead !== 'failed') closeWaiting.current = true;
    else void submit();
  });
  // The steps landed: the form starts from them, as from the rest of the saved spell, and
  // only then is the jar drawn, since its list reads the steps once, as it mounts.
  const stepsLanded = stepsRead === undefined;
  useEffect(() => {
    if (!stepsLanded || jarReady || !spell) return;
    // A reset, then what was typed meanwhile put back: `resetField` skips a field
    // nothing has registered, and the jar's list registers the steps only once drawn.
    const typedMeanwhile = getValues();
    reset(valuesOf(spell));
    for (const name of [...FIELDS, 'visibility', 'categoryIds'] as const) {
      setValue(name, typedMeanwhile[name]);
    }
    setJarReady(true);
    // Run when the steps land, never again for a later answer: a save resets the form itself.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepsLanded]);
  // The held Close's save, from the render that drew the jar, whose `send` sends.
  useEffect(() => {
    if (!jarReady || !closeWaiting.current) return;
    closeWaiting.current = false;
    void submit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jarReady]);
  // The failed read is said in the jar, so its shut section opens to show it.
  useEffect(() => {
    if (stepsRead === 'failed') setOpen((was) => new Set([...was, 'Jar' as const]));
  }, [stepsRead]);

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
                <div className="spell-field-cap">
                  <TextField<SpellBuilderValues>
                    name="title"
                    label="Title"
                    placeholder="Add a title"
                    autoComplete="off"
                  />
                </div>
                <div className="spell-field-cap">
                  <TextField<SpellBuilderValues>
                    name="intent"
                    label="Intent"
                    placeholder="Add an intent"
                    multiline
                    rows={3}
                  />
                </div>
                <SpellCategoriesField />
              </>,
            )}
            {section(
              'Jar',
              <>
                <div className="spell-jar-layout">
                  <div className="spell-jar-layout__list">
                    {jarReady ? (
                      <SpellSteps workspaceId={workspaceId} />
                    ) : stepsRead === 'failed' ? (
                      <Notice kind="error">{STEPS_FAILED}</Notice>
                    ) : (
                      <section className="spell-steps" aria-label="Steps" aria-busy="true">
                        <Skeleton shape="line" />
                      </section>
                    )}
                  </div>
                  <JarAside
                    ready={jarReady}
                    descriptionField={
                      <TextField<SpellBuilderValues>
                        name="jarDescription"
                        label="Jar Description"
                        placeholder="Add a description"
                        autoComplete="off"
                      />
                    }
                    waxField={
                      <TextField<SpellBuilderValues>
                        name="sealWaxColor"
                        label="Seal Wax Colour"
                        placeholder="Add a colour"
                        autoComplete="off"
                      />
                    }
                  />
                </div>
              </>,
            )}
            {/* The recipe's timing: when to work the spell, not when it was worked,
                which a working's own date gives (M13.4). */}
            {section(
              'When to Work It',
              <>
                <div className="spell-field-cap">
                  <SpellSuggestField
                    name="moonPhase"
                    label="Moon Phase"
                    placeholder="Add a phase"
                    options={MOON_PHASES}
                    icon={moonPhaseIcon}
                  />
                </div>
                <div className="spell-field-cap">
                  <SpellSuggestField
                    name="dayOfWeek"
                    label="Day of the Week"
                    placeholder="Add a day"
                    options={DAYS_OF_THE_WEEK}
                  />
                </div>
              </>,
            )}
            {section(
              'Notes',
              <>
                <div className="spell-field-cap">
                  <TextField<SpellBuilderValues>
                    name="note"
                    label="Note"
                    placeholder="Add a note"
                    multiline
                  />
                </div>
                <SpellStatusField save={send} />
                <SpellVisibilityField created={saved !== null} save={send} />
              </>,
            )}
          </div>
          <FormActions
            noun="Spell"
            dirty={dirty && !unitRefused && jarReady}
            submitting={isSubmitting}
          />
        </form>
      </FormHistoryContext.Provider>
    </FormProvider>
  );
};

export default SpellBuilder;
