'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import type { Route } from 'next';
import { type ReactElement, type ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
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
import { moonPhaseIcon } from './moon-phase-icon';
import { BinButton } from '../IconTip';
import { ConfirmQuestion, useModalHeaderNote } from '../Modal';
import { useDeleteSpell } from '../SpellRecipe/delete-spell';
import { UNTITLED_SPELL } from '../SpellCard';
import Notice from '../Notice';
import SaveStatus from '../SaveStatus';
import Skeleton from '../Skeleton';
import { SpellCategoriesField, sameCategories, useCategoryName } from './categories-field';
import { SpellComparison } from './comparison-panel';
import { JarDetails } from './jar-details';
import { DAYS_OF_THE_WEEK, MOON_PHASES } from './constants';
import { readLatestSpell, saveSpell } from './autosave';
import { useSaveOnClose } from './save-on-close';
import { SpellSteps } from './steps';
import type { SpellStepSend, SpellStepValue } from './steps/types';
import {
  isBlankNewInstruction,
  isBlankSavedInstruction,
  stepInputOf,
  restoredSteps,
  stepValueOf,
  stepsChanged,
  unitIssues,
} from './steps/values';
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

// The spell builder: a spell's title, intent, jar and note in four folding sections, inside the
// dialog (./spell-dialog.tsx). It autosaves (./autosave.ts) and Close saves first
// (./save-on-close.ts). (claude-docs/components/spell-builder.md, "The builder's sections and
// autosave")

/** A step's saved id, set by a save's answer: bookkeeping, never a step of the history. */
const isStepIdName = (name: string): boolean => /^steps\.\d+\.stepId$/.test(name);

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
      // The steps that lay something: an instruction step has no name.
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
    visibility: spell?.visibility ?? 'private',
    // A new spell is a draft.
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
 * The schema's reading of the steps as a save sends them, and the unit
 * rule, which needs the coven's jars and so is not the schema's: a refused
 * unit is said beside it, under the step's `unit`, as the service says it.
 */
const resolver: Resolver<SpellBuilderValues, unknown, SpellBuilderInput> = async (
  values,
  context,
  options,
) => {
  // A new blank instruction is not checked until a save is asked for (Save
  // or Close), since the autosave leaves it out and says nothing of it.
  const asked = (context as { current: boolean } | undefined)?.current === true;
  const kept = values.steps.flatMap((step, index) =>
    asked || !isBlankNewInstruction(step) ? [index] : [],
  );
  const result = await schemaResolver(
    { ...values, steps: kept.map((index) => stepInputOf(values.steps[index]!)) },
    context,
    options as unknown as Parameters<typeof schemaResolver>[2],
  );
  const issues = unitIssues(values.steps);
  const { steps: checked, ...otherErrors } = result.errors as Record<string, unknown>;
  // The errors name the steps by their place among those checked: back to the form's.
  const found: Record<string, unknown>[] = [];
  if (Array.isArray(checked)) {
    checked.forEach((error: Record<string, unknown>, at: number) => {
      if (error && kept[at] !== undefined) found[kept[at]!] = error;
    });
  }
  if (issues.size === 0 && !found.some(Boolean) && Object.keys(otherErrors).length === 0) {
    return { values: result.values, errors: {} } as Awaited<ReturnType<typeof resolver>>;
  }
  const errors: Record<string, unknown> = { ...otherErrors };
  const steps: Record<string, unknown>[] = [...found];
  for (const [index, message] of issues) {
    steps[index] = { ...steps[index], unit: { type: 'unit', message } };
  }
  return {
    values: {},
    errors: { ...errors, ...(steps.some(Boolean) ? { steps } : {}) },
  } as Awaited<ReturnType<typeof resolver>>;
};

/** Said in the jar's place while a saved spell's steps cannot be read. */
const STEPS_FAILED =
  "The spell's steps could not be loaded, so nothing can be saved. Reload the page to try again.";

/** Said on the form when Reload Latest could not read the spell: the conflict stays, to try again. */
const RELOAD_FAILED = "The latest version couldn't be loaded. Try again.";

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
  covenSlug,
  userId,
  spell,
  onCreated,
  stepsRead,
  deletedHrefOf,
  copiedHrefOf,
}: SpellBuilderProps): ReactElement => {
  // The spell this builder opened on. The dialog hands the builder a different
  // `spell` once the builder's own first save has moved the address to it; the
  // builder keeps what it opened with and carries the id its save returned.
  const look = covenSlug === undefined ? undefined : { workspaceId, covenSlug };
  const [opened] = useState(spell);
  const [createdId, setCreatedId] = useState<string | null>(null);
  // True while a save the person asked for runs: the resolver then checks a blank new instruction
  // too.
  const asked = useRef(false);
  const methods = useForm<SpellBuilderValues, unknown, SpellBuilderInput>({
    defaultValues: valuesOf(spell),
    resolver,
    context: asked,
    // A field is checked when it is first left, and on every change after,
    // as the ingredient form's are.
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

  // Something to save: a field that reads differently from the last save (blank and spaces reading
  // as none, as the schema does), a changed visibility or status, category pick or step.
  const typed = useWatch({ control, name: [...FIELDS] });
  const picked = useWatch({ control, name: 'categoryIds' });
  const categoriesChanged = !sameCategories(picked, defaultValues?.categoryIds);
  const visibility = useWatch({ control, name: 'visibility' });
  const status = useWatch({ control, name: 'status' });
  const steps = useWatch({ control, name: 'steps' });
  const values = useWatch({ control }) as SpellBuilderValues;
  const categoryName = useCategoryName();
  // The autosave never sends a blank new instruction: it stays in the form, unsaved and
  // unmentioned.
  const sendable = steps.filter((step) => !isBlankNewInstruction(step));
  const dirty =
    categoriesChanged ||
    visibility !== defaultValues?.visibility ||
    status !== defaultValues?.status ||
    FIELDS.some(
      (field, index) => (typed[index] ?? '').trim() !== (defaultValues?.[field] ?? '').trim(),
    ) ||
    stepsChanged(sendable, (defaultValues?.steps ?? []) as SpellBuilderValues['steps']);
  // A unit the jar cannot be measured in holds Save, as the service would refuse it.
  const unitIssueSteps = unitIssues(steps);
  const unitRefused = unitIssueSteps.size > 0;
  // A saved instruction cleared of its text cannot be left out (that would delete it), so the
  // autosave waits.
  const blankSaved = steps.some(isBlankSavedInstruction);

  // A new spell opens every section, to be filled in order; a saved one opens
  // them shut, each line saying what it holds, as Add Ingredient's do.
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
  // An Undo or Redo writes saved steps back as they were; one a save has since removed is
  // gone from the server, so it comes back as a new step (no id) and the next save adds it.
  const liveStepIds = useCallback(
    (): Set<string> =>
      new Set(
        ((methods.control._defaultValues.steps ?? []) as (SpellStepValue | undefined)[]).flatMap(
          (step) => (step?.stepId ? [step.stepId] : []),
        ),
      ),
    [methods.control],
  );
  const prepareRestored = useCallback(
    (name: string, value: unknown): unknown => {
      if (name === 'steps' && Array.isArray(value))
        return restoredSteps(value as SpellStepValue[], liveStepIds());
      if (/^steps\.\d+$/.test(name) && value)
        return restoredSteps([value as SpellStepValue], liveStepIds())[0];
      if (/^steps\.\d+\.stepId$/.test(name))
        return liveStepIds().has(value as string) ? value : null;
      return value;
    },
    [liveStepIds],
  );
  const history = useFormHistory(methods, { root, prepare: prepareRestored, skip: isStepIdName });

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
    // The save left out any blank new instruction, so its steps are placed among the form's that
    // were sendable.
    const now = getValues('steps')
      .map((step, at) => ({ step, at }))
      .filter(({ step }) => !isBlankNewInstruction(step));
    sent.steps.forEach((step, index) => {
      const created = answer.steps[index];
      const current = now[index]?.step;
      if (
        step.stepId !== null ||
        !created ||
        !current ||
        current.stepId !== null ||
        JSON.stringify(stepInputOf(current)) !== JSON.stringify(stepInputOf(step))
      )
        return;
      setValue(`steps.${now[index]!.at}.stepId`, created.id);
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
    // The checks run on the form as it is now; the values sent are the ones the autosave handed
    // over.
    const checked = (await trigger())
      ? SpellInput.safeParse({ ...sent, steps: sent.steps.map(stepInputOf) })
      : null;
    if (!checked?.success) {
      openErred();
      throw fieldsRefused();
    }
    // The categories go only when the picks differ from the last save: left
    // out, the service keeps the spell's set as it is.
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
          : // After Keep My Version the engine's revision is the one the refusal reported.
            { kind: 'spell', id, revision: context.revision },
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

  const [deleting, setDeleting] = useState(false);
  const spellId = createdId ?? opened?.id ?? null;
  const name = useWatch({ control, name: 'title' })?.trim() || UNTITLED_SPELL;
  // The shared Delete Spell write; `removed` holds the autosave and the save on close once it is sent.
  const { remove, pending: removed } = useDeleteSpell({
    workspaceId,
    spellId: spellId ?? '',
    deletedHref: deletedHrefOf?.(name) ?? ('/' as Route),
    onRefused: (message) => setError('root', { message }),
    onClosed: () => setDeleting(false),
  });

  const mirror = userId
    ? mirrorKey({ entity: 'spell', id: createdId ?? opened?.id ?? null, userId })
    : undefined;
  const autosave = useAutosave({
    value: { ...values, steps: sendable },
    dirty,
    enabled: jarReady && !unitRefused && !blankSaved && !removed,
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
    asked.current = true;
    try {
      await markSubmitted();
      // The autosave holds back a cleared saved instruction, so the error just drawn is the answer.
      if (getValues('steps').some(isBlankSavedInstruction)) return;
      await flush().catch(() => undefined);
    } finally {
      asked.current = false;
    }
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
      const held = getValues('steps');
      if (unitIssues(held).size > 0 || held.some(isBlankSavedInstruction)) {
        asked.current = true;
        await markSubmitted();
        asked.current = false;
        openErred();
        throw fieldsRefused();
      }
      asked.current = true;
      await markSubmitted();
      await flush();
      return true;
    } catch {
      closing.current = false;
      announce();
      return false;
    } finally {
      closing.current = false;
      asked.current = false;
    }
  };
  // Why Save Spell is off, a tip on the button, so a disabled button is never a silent one. Left
  // out while a save is on its way, and once an edit has been autosaved: the save left nothing to
  // save, and "Nothing to save yet" is for a spell not yet edited.
  const firstUnitIssue = [...unitIssueSteps.keys()][0];
  const saveReason =
    autosave.status === 'saving'
      ? null
      : firstUnitIssue !== undefined
        ? `Fix the unit in step ${firstUnitIssue + 1} to save`
        : !jarReady
          ? 'Waiting for the jar to load'
          : !dirty && autosave.status === 'idle'
            ? 'Nothing to save yet'
            : null;
  // Steps that could not be read leave nothing a save would take, so Close closes, unsaved.
  useSaveOnClose(dirty && stepsRead !== 'failed' && !removed, saveForClose);

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
    // The draft may be older than a save that removed a step: its ids are checked against the saved
    // ones.
    reset(
      { ...recovered.value, steps: restoredSteps(recovered.value.steps, liveStepIds()) },
      { keepDefaultValues: true },
    );
    setRecovered(null);
  };
  const discardRecovered = () => {
    if (mirror) clearMirror(mirror);
    setRecovered(null);
  };
  // Where the recovery banner and the conflict notice go: under a dialog's title, in view however
  // far the form has scrolled, since in the footer or above the fields they were missed. Outside a
  // modal they stay in the form's flow.
  const headerNote = useModalHeaderNote();
  const recovery = recovered && jarReady && (
    <Notice kind="warn" block className="spell-builder__restored">
      <span>Restored unsaved changes from {clockTime(recovered.at)}</span>
      <span className="spell-builder__recovered">
        {/* One primary: Keep, the choice that loses no typing; Discard sits back, quiet. */}
        <button type="button" className="btn btn--small btn--solid" onClick={keepRecovered}>
          Keep
        </button>
        <button type="button" className="btn btn--small btn--quiet" onClick={discardRecovered}>
          Discard
        </button>
      </span>
    </Notice>
  );

  /**
   * Reload Latest, after a stale save: replaces the form, typing included, with the spell as the server has it; a failed read leaves the conflict as it is
   * (claude-docs/components/spell-builder.md, "The save module and its conflicts").
   */
  const reloadLatest = async () => {
    const id = createdId ?? opened?.id;
    if (!id) return;
    let latest: SpellBuilderSpell;
    try {
      latest = await readLatestSpell(workspaceId, id);
    } catch {
      setError('root', { message: RELOAD_FAILED });
      openErred();
      return;
    }
    await autosave.resolveConflict('reload');
    reset(valuesOf(latest));
    clearErrors('root');
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
          {recovery && (headerNote ? createPortal(recovery, headerNote) : recovery)}
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
                <JarDetails
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
                      label="Seal Wax"
                      placeholder="Add a colour"
                      autoComplete="off"
                    />
                  }
                />
                {jarReady ? (
                  <SpellSteps workspaceId={workspaceId} look={look} />
                ) : stepsRead === 'failed' ? (
                  <Notice kind="error">{STEPS_FAILED}</Notice>
                ) : (
                  <section className="spell-steps" aria-label="Steps" aria-busy="true">
                    <Skeleton shape="line" />
                  </section>
                )}
                {jarReady && <SpellComparison />}
              </>,
            )}
            {/* The recipe's timing: when to work the spell, not when it was worked,
                which a working's own date gives. */}
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
                  label="Day"
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
            saveReason={saveReason ?? undefined}
            aside={
              deletedHrefOf && spellId ? (
                <BinButton
                  verb="Delete Spell"
                  name={name}
                  onClick={() => {
                    clearErrors('root');
                    setDeleting(true);
                  }}
                />
              ) : undefined
            }
          >
            <SpellStatusField
              flush={flush}
              workspaceId={workspaceId}
              spellId={spellId}
              copiedHrefOf={copiedHrefOf}
            />
            <SaveStatus
              status={autosave.status}
              savedAt={autosave.savedAt}
              draft={defaultValues?.status !== 'complete'}
              conflictMessage="This spell was changed elsewhere."
              conflictInto={headerNote}
              onRetry={autosave.retry}
              onReload={() => void reloadLatest()}
              onKeepMine={() => void autosave.resolveConflict('keep-mine').catch(() => undefined)}
            />
          </FormActions>
          <ConfirmQuestion
            asked={deleting}
            question={
              <>
                Delete {name}? It leaves the grimoire for every member of the coven. Nothing in
                stock changes.
              </>
            }
            busy={removed}
            onConfirm={async () => remove()}
            onKeep={() => setDeleting(false)}
          />
        </form>
      </FormHistoryContext.Provider>
    </FormProvider>
  );
};

export default SpellBuilder;
