'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { type ReactElement, type ReactNode, useEffect, useRef, useState } from 'react';
import { FormProvider, type Resolver, useForm, useWatch } from 'react-hook-form';
import { CollapsibleSection, FoldAll } from '../CollapsibleSection';
import {
  type MirrorEntry,
  type SaveContext,
  type SaveResult,
  clearMirror,
  mirrorKey,
  readMirror,
  useAutosave,
} from '../../lib/autosave';
import { GraphQLClientError, StaleWriteError } from '../../lib/graphql-client-error';
import { placeServerIssues } from '../../lib/graphql-failure';
import {
  FormActions,
  FormHistoryButtons,
  FormHistoryContext,
  TextField,
  useFormHistory,
} from '../Field';
import { clockTime } from '../LastEdit/relative';
import MoonPhaseIcon from '../MoonPhaseIcon';
import Notice from '../Notice';
import SaveStatus from '../SaveStatus';
import Skeleton from '../Skeleton';
import { SpellCategoriesField, sameCategories, useCategoryName } from './categories-field';
import { SpellComparison } from './comparison-panel';
import { DAYS_OF_THE_WEEK, MOON_PHASES } from './constants';
import { saveSpell } from './autosave';
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
// only when the spell is marked complete (M10.20). The builder autosaves
// (M13.17, ./autosave.ts): a change saves 3 s after the last, Save saves at
// once, and the first save creates the spell, after which the builder holds
// its id and revision and `onCreated` moves the dialog's address to it. There
// is no Cancel: Close saves what is unsaved, then closes (./save-on-close.ts).
// See claude-docs/components/spell-builder.md.

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

/** Said in the jar's place while a saved spell's steps cannot be read. */
const STEPS_FAILED =
  "The spell's steps could not be loaded, so nothing can be saved. Reload the page to try again.";

/** Said on the form when a save is tried while a field holds an error the form shows. */
const FIX_FIELDS = 'Some fields need fixing before this can be saved.';

/** The error a save throws for a form the browser's own check refused: a refusal, so the hook does not retry it. */
const fieldsRefused = (): GraphQLClientError =>
  new GraphQLClientError({
    status: 400,
    errors: [{ message: FIX_FIELDS, extensions: { code: 'VALIDATION' } }],
  });

const SpellBuilder = ({
  workspaceId,
  userId,
  spell,
  onCreated,
  stepsRead,
}: SpellBuilderProps): ReactElement => {
  // The spell this builder opened on. The dialog hands the builder a different
  // `spell` once the builder's own first save has moved the address to it; the
  // builder keeps what it opened with and carries the id its save returned.
  const [opened] = useState(spell);
  const [createdId, setCreatedId] = useState<string | null>(null);
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
    reset,
    getValues,
    setError,
    setValue,
    trigger,
    handleSubmit,
    clearErrors,
    formState: { errors, defaultValues },
  } = methods;

  // Something to save: a field that reads differently from the last save,
  // blank and spaces alike reading as none, as the schema reads them, or a
  // visibility or status other than the last save's, which is a choice worth
  // saving on its own (the owner's call, 2026-10-27), a changed category pick,
  // or a changed step.
  const typed = useWatch({ control, name: [...FIELDS] });
  const picked = useWatch({ control, name: 'categoryIds' });
  const categoriesChanged = !sameCategories(picked, defaultValues?.categoryIds);
  const visibility = useWatch({ control, name: 'visibility' });
  const status = useWatch({ control, name: 'status' });
  const steps = useWatch({ control, name: 'steps' });
  const values = useWatch({ control }) as SpellBuilderValues;
  const categoryName = useCategoryName();
  const dirty =
    categoriesChanged ||
    visibility !== defaultValues?.visibility ||
    status !== defaultValues?.status ||
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

  // The steps of a saved spell are on their way, or could not be read: until
  // they are in the form nothing is saved, since an update's steps are the
  // whole recipe and one sent now would remove the rest.
  const [jarReady, setJarReady] = useState(stepsRead === undefined);

  /** Places a refused save's issues beside their fields, or above them all. */
  const placeIssues = (error: unknown) => {
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
  };

  /**
   * What a save answered is the form's new start: Save goes off until the next
   * change. The values stay as they are, so what was typed while the save was
   * in flight is not lost and reads as the next change. A step this save
   * created takes its new id, or the next save would create it again.
   */
  const rebase = (answer: SpellBuilderSpell, sent: SpellBuilderValues) => {
    reset(
      { ...valuesOf(answer), categoryIds: sent.categoryIds },
      { keepValues: true, keepErrors: true },
    );
    const now = getValues('steps');
    sent.steps.forEach((step, index) => {
      const created = answer.steps[index];
      const current = now[index];
      if (
        step.stepId !== null ||
        !created ||
        !current ||
        current.stepId !== null ||
        JSON.stringify(stepInputOf(current)) !== JSON.stringify(stepInputOf(step))
      )
        return;
      setValue(`steps.${index}.stepId`, created.id);
    });
  };

  // The first save's answer, held until the address may move to it: a Close
  // waiting on that save closes, and leaves the address be.
  const closing = useRef(false);
  const createdAnswer = useRef<SpellBuilderSpell | null>(null);
  const announce = () => {
    const answer = createdAnswer.current;
    createdAnswer.current = null;
    if (answer) onCreated?.(answer);
  };

  /**
   * The one save every way in goes through (the autosave's, Save's, Close's,
   * Mark Complete's and Share's): checked as the schema reads the form, then
   * sent to the spell this builder holds, or created. A refusal lands beside
   * its field, or above them all, and is thrown for the autosave to report.
   */
  const persist = async (sent: SpellBuilderValues, context: SaveContext): Promise<SaveResult> => {
    // The checks run on the form as it is now; the values sent are the ones the autosave handed over.
    const checked = (await trigger())
      ? SpellInput.safeParse({ ...sent, steps: sent.steps.map(stepInputOf) })
      : null;
    if (!checked?.success) {
      openErred();
      throw fieldsRefused();
    }
    // The categories go only when the picks differ from the last save: left
    // out, the service keeps the spell's set as it is (M10.14).
    const { categoryIds: picks = [], ...rest } = checked.data;
    const input = rest as unknown as SpellBuilderInput;
    if (!sameCategories(picks, defaultValues?.categoryIds)) input.categoryIds = picks;
    const id = context.id ?? opened?.id ?? null;
    let answer: SpellBuilderSpell;
    try {
      answer = await saveSpell(
        workspaceId,
        id === null
          ? { kind: 'new' }
          : { kind: 'spell', id, revision: context.force ? null : context.revision },
        input,
      );
    } catch (error) {
      if (error instanceof GraphQLClientError && !(error instanceof StaleWriteError)) {
        placeIssues(error);
      }
      throw error;
    }
    rebase(answer, sent);
    clearErrors('root');
    if (id === null) {
      setCreatedId(answer.id);
      createdAnswer.current = answer;
      if (!closing.current) announce();
    }
    return { revision: answer.revision, savedAt: new Date(), id: answer.id };
  };

  const mirror = userId
    ? mirrorKey({ entity: 'spell', id: createdId ?? opened?.id ?? null, userId })
    : undefined;
  const autosave = useAutosave({
    value: values,
    dirty,
    enabled: jarReady && !unitRefused,
    save: persist,
    mirror,
    revision: opened?.revision ?? null,
    root,
  });
  const { flush } = autosave;

  /**
   * Marks the form submitted, so every error it holds is drawn: a save the
   * person asked for (Save, Enter, Close) shows what is wrong, where the
   * autosave stays quiet on a field not yet visited.
   */
  const markSubmitted = () =>
    handleSubmit(
      () => undefined,
      () => undefined,
    )();
  /** Saves now, for Save and Enter; a refusal is shown by the status beside Save. */
  const saveNow = async () => {
    await markSubmitted();
    await flush().catch(() => undefined);
  };

  // A Close pressed while the steps are on their way saves once they land.
  const jarWaiters = useRef<(() => void)[]>([]);
  useEffect(() => {
    if (!jarReady) return;
    for (const resume of jarWaiters.current.splice(0)) resume();
  }, [jarReady]);
  /** Saves for Close, answering whether the server has everything; a refusal keeps the dialog open. */
  const saveForClose = async (): Promise<boolean> => {
    closing.current = true;
    try {
      if (!jarReady) await new Promise<void>((resume) => jarWaiters.current.push(resume));
      // The autosave holds back a unit the jar cannot take, so Close says why instead.
      if (unitIssues(getValues('steps')).size > 0) {
        await trigger();
        openErred();
        throw fieldsRefused();
      }
      await markSubmitted();
      await flush();
      return true;
    } catch {
      closing.current = false;
      announce();
      return false;
    } finally {
      closing.current = false;
    }
  };
  // Steps that could not be read leave nothing a save would take, so Close closes, unsaved.
  useSaveOnClose(dirty && stepsRead !== 'failed', saveForClose);

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
    // Run when the steps land, never again for a later answer: a save rebases the form itself.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepsLanded]);
  // The failed read is said in the jar, so its shut section opens to show it.
  useEffect(() => {
    if (stepsRead === 'failed') setOpen((was) => new Set([...was, 'Jar' as const]));
  }, [stepsRead]);

  // A copy of the form this browser kept that the server may not have: offered
  // back once, when the builder opens, since the first change writes over it.
  const [recovered, setRecovered] = useState<MirrorEntry<SpellBuilderValues> | null>(null);
  useEffect(() => {
    if (!mirror) return;
    const entry = readMirror<SpellBuilderValues>(mirror);
    if (!entry) return;
    // A copy no newer than the saved row is what the row already holds.
    const savedAt = opened?.updatedAt ? new Date(opened.updatedAt) : null;
    if (
      (savedAt && entry.at.getTime() <= savedAt.getTime()) ||
      !Array.isArray(entry.value?.steps)
    ) {
      clearMirror(mirror);
      return;
    }
    setRecovered(entry);
    // Only as it opens: a later key is the same spell once created.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const keepRecovered = () => {
    if (!recovered) return;
    reset(recovered.value, { keepDefaultValues: true });
    setRecovered(null);
  };
  const discardRecovered = () => {
    if (mirror) clearMirror(mirror);
    setRecovered(null);
  };

  return (
    <FormProvider {...methods}>
      <FormHistoryContext.Provider value={history}>
        <form
          ref={root}
          className="form spell-builder"
          onSubmit={(event) => {
            event.preventDefault();
            void saveNow();
          }}
          noValidate
        >
          {recovered && jarReady && (
            <Notice kind="plain" block>
              <span>Restored unsaved changes from {clockTime(recovered.at)}</span>
              <span className="spell-builder__recovered">
                <button type="button" className="btn btn--small" onClick={keepRecovered}>
                  Keep
                </button>
                <button type="button" className="btn btn--small" onClick={discardRecovered}>
                  Discard
                </button>
              </span>
            </Notice>
          )}
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
                {jarReady ? (
                  <SpellSteps workspaceId={workspaceId} />
                ) : stepsRead === 'failed' ? (
                  <Notice kind="error">{STEPS_FAILED}</Notice>
                ) : (
                  <section className="spell-steps" aria-label="Steps" aria-busy="true">
                    <Skeleton shape="line" />
                  </section>
                )}
                {/* Intent against the jar's categories (M10.17), after the jar it reads. */}
                {jarReady && <SpellComparison />}
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
                <SpellStatusField flush={flush} />
                <SpellVisibilityField
                  created={opened !== undefined || createdId !== null}
                  flush={flush}
                />
              </>,
            )}
          </div>
          <FormActions
            noun="Spell"
            dirty={dirty && !unitRefused && jarReady}
            submitting={autosave.status === 'saving'}
            onSave={() => void saveNow()}
          >
            <SaveStatus
              status={autosave.status}
              savedAt={autosave.savedAt}
              draft={defaultValues?.status !== 'complete'}
              conflictMessage="This spell was changed elsewhere."
              onRetry={autosave.retry}
              onReload={() => {
                // Reloading the page reads the saved row afresh (the proper reload is M13.18's).
                void autosave.resolveConflict('reload').then(() => window.location.reload());
              }}
              onKeepMine={() => void autosave.resolveConflict('keep-mine').catch(() => undefined)}
            />
          </FormActions>
        </form>
      </FormHistoryContext.Provider>
    </FormProvider>
  );
};

export default SpellBuilder;
