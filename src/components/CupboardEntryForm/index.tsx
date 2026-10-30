'use client';

import { usePendingNavigation } from '../../lib/navigation';
import { useMutation } from '@tanstack/react-query';
import { type ReactElement, useId, useRef, useState } from 'react';
import { GraphQLClientError, StaleWriteError } from '../../lib/graphql-client-error';
import { useAutosave, type SaveContext, type SaveResult } from '../../lib/autosave';
import { FormProvider, useForm, useWatch } from 'react-hook-form';
import { graphql } from '../../gql';
import { graphqlRequest } from '../../lib/graphql-client';
import { readGraphqlIssues } from '../../lib/graphql-failure';
import {
  FieldShell,
  FormActions,
  FormHistoryButtons,
  FormHistoryContext,
  fieldDescription,
  useFormHistory,
} from '../Field';
import { ListField, MultiSelectField } from '../IngredientForm/fields';
import {
  LookupListField,
  useCelestialBodySuggestions,
  useZodiacSuggestions,
} from '../IngredientForm/suggestions';
import { ELEMENT_OPTIONS } from '../IngredientForm/options';
import IconTip, { UndoIcon } from '../IconTip';
import { useModalHeaderNote } from '../Modal';
import SaveStatus from '../SaveStatus';
import { useSaveOnClose } from '../SpellBuilder/save-on-close';
import Notice from '../Notice';
import { FIELDS, differs, baselineOf, changesOf, isOwn, openingValues } from './changes';
import { fromForm, toForm, type CupboardFormValues } from './form-values';
import type {
  CupboardChanges,
  CupboardEntryFormProps,
  CupboardField,
  CupboardOverrides,
  TextField,
} from './types';
import './index.scss';

// The coven's override form for a compendium entry it holds: seven fields, each with a "Restore
// Original", on react-hook-form. Null (the compendium's) and an empty list (cleared) are told apart in
// `changes.ts` (claude-docs/components/cupboard-entry-form.md). It saves as it is edited, the way the
// ingredient form does (claude-docs/components/autosave.md).

const AnnotateCupboardEntryDocument = graphql(`
  mutation AnnotateCupboardEntry(
    $workspaceId: ID!
    $ingredientId: ID!
    $input: CupboardEntryInput!
    $expectedRevision: Int
  ) {
    annotateCupboardEntry(
      workspaceId: $workspaceId
      ingredientId: $ingredientId
      input: $input
      expectedRevision: $expectedRevision
    ) {
      id
      revision
    }
  }
`);

// A field keeps a tip only for a rule its label does not say (info-tip.md, "When a
// field gets a tip"): Label's uniqueness, and the lists' "empty says none".
const TEXT: Record<TextField, { label: string; hint?: string; placeholder: string }> = {
  label: {
    label: 'Label',
    hint: "What your coven calls this entry. It stands in for the Compendium's name on your pages, and no two entries in a coven share one.",
    placeholder: 'Add a label',
  },
  description: {
    label: 'Description',
    placeholder: 'Add a description',
  },
  safetyNotes: {
    label: 'Safety Notes',
    placeholder: 'Add safety notes',
  },
};

/**
 * A list's tip, one wording for all four: the list is the coven's own, and an emptied one says the
 * entry has none. Colours adds that a colour is what it corresponds to in a working.
 */
const listHint = (things: string, how = ''): string =>
  `The ${things} your coven ties it to${how}, in place of the Compendium's. An empty list says it has none.`;

/** Where a server refusal lands: the field's own place, or a list's entry or typing box. */
const placeOf = (
  path: readonly (string | number)[],
): { field: CupboardField; at?: number } | undefined => {
  // The input's own fields, with or without the argument's name before them.
  const [first, second] = path[0] === 'input' ? path.slice(1) : path;
  const field = FIELDS.find((name) => name === first);
  if (!field) return undefined;
  return { field, at: typeof second === 'number' ? second : undefined };
};

/** Whether any list's typing box holds text. */
const hasDrafts = (drafts: Record<string, string>): boolean =>
  Object.values(drafts).some((text) => text.trim() !== '');

const TEXT_FIELD_NAMES: readonly CupboardField[] = ['label', 'description', 'safetyNotes'];
const LIST_BOX = ['celestialBodies', 'zodiacSigns', 'colors'] as const;

const CupboardEntryForm = ({
  workspaceId,
  ingredientId,
  compendium,
  overrides: opened,
  revision = null,
  onDone,
  aside,
}: CupboardEntryFormProps): ReactElement => {
  const id = useId();
  const { refresh } = usePendingNavigation();
  const form = useRef<HTMLFormElement>(null);
  const baseline = baselineOf(compendium);
  // What the cupboard row holds now: the overrides the page read, then each save's own.
  const [overrides, setOverrides] = useState<CupboardOverrides>(opened);
  const overridesRef = useRef(overrides);
  const revisionRef = useRef<number | null>(revision);
  const methods = useForm<CupboardFormValues>({
    defaultValues: toForm(openingValues(baseline, opened)),
  });
  const { control, register, setValue, getValues, setError, clearErrors, formState } = methods;
  const { errors } = formState;
  const [handedBack, setHandedBack] = useState<ReadonlySet<CupboardField>>(new Set());
  const [alert, setAlert] = useState<string>();

  const values = fromForm(useWatch({ control }) as CupboardFormValues);
  // A field stays handed back only while it still holds the compendium's: a
  // new answer, or an undo, ends it.
  const handed = new Set([...handedBack].filter((field) => !differs(field, values, baseline)));
  const changes = changesOf(values, baseline, overrides, handed);
  const dirty = Object.keys(changes).length > 0;
  const history = useFormHistory(methods, { root: form });
  const headerNote = useModalHeaderNote();

  const save = useMutation({
    mutationFn: ({
      input,
      expectedRevision,
    }: {
      input: CupboardChanges;
      expectedRevision?: number;
    }) =>
      graphqlRequest(AnnotateCupboardEntryDocument, {
        workspaceId,
        ingredientId,
        input,
        expectedRevision,
      }),
  });

  /** Puts a refusal beside its field, or in the alert when it names none. */
  const placeRefusal = (error: unknown): void => {
    const unplaced: string[] = [];
    let placed = 0;
    for (const { path, message } of readGraphqlIssues(error)) {
      const where = placeOf(path);
      if (!where) {
        unplaced.push(message);
        continue;
      }
      placed += 1;
      const { field, at } = where;
      if (field === 'elements' || TEXT_FIELD_NAMES.includes(field)) setError(field, { message });
      else if (at !== undefined) setError(`${field}.${at}.value` as never, { message });
      else setError(`drafts.${field}` as never, { message });
    }
    if (unplaced.length > 0) setAlert(unplaced.join(' '));
    else if (placed === 0) setAlert("That didn't work. Please try again.");
  };

  /**
   * The one save the autosave, Save and Close go through. It writes against the revision the server
   * last answered with; only Keep My Version names another. A refusal lands beside its field and is
   * thrown for the autosave to report.
   */
  const persist = async (sent: CupboardChanges, context: SaveContext): Promise<SaveResult> => {
    setAlert(undefined);
    let answer;
    try {
      answer = await save.mutateAsync({
        input: sent,
        expectedRevision: (context.force ? context.revision : revisionRef.current) ?? undefined,
      });
    } catch (error) {
      if (error instanceof GraphQLClientError && !(error instanceof StaleWriteError)) {
        placeRefusal(error);
      }
      throw error;
    }
    revisionRef.current = answer.annotateCupboardEntry.revision;
    // A null hands the field back to the compendium, which is what the row now holds.
    overridesRef.current = { ...overridesRef.current, ...sent } as CupboardOverrides;
    setOverrides(overridesRef.current);
    refresh();
    return {
      revision: answer.annotateCupboardEntry.revision,
      savedAt: new Date(),
      id: ingredientId,
    };
  };

  const autosave = useAutosave<CupboardChanges>({
    value: changes,
    dirty,
    enabled: true,
    save: persist,
    revision,
    root: form,
  });

  /**
   * Everything typed is on the server, or this throws: the pending autosave first, then any text
   * left in a list's box, which is an entry the person meant to add.
   */
  const saveAll = async (): Promise<void> => {
    await autosave.flush();
    const held = getValues();
    const settled = { ...held };
    let drafted = false;
    for (const list of LIST_BOX) {
      const text = held.drafts[list].trim();
      if (text === '') continue;
      settled[list] = [...held[list], { value: text }];
      drafted = true;
    }
    if (!drafted) return;
    const sent = changesOf(fromForm(settled), baseline, overridesRef.current, handed);
    for (const list of LIST_BOX) {
      setValue(list, settled[list]);
      setValue(`drafts.${list}`, '');
    }
    if (Object.keys(sent).length === 0) return;
    await persist(sent, { revision: revisionRef.current, force: false, id: ingredientId });
  };

  const saveForClose = async (): Promise<boolean> => {
    try {
      await saveAll();
      return true;
    } catch {
      return false;
    }
  };
  useSaveOnClose(dirty || hasDrafts(getValues().drafts), saveForClose);

  /** Reload after a stale save: the page reads the server's copy again, which replaces the form. */
  const reload = async (): Promise<void> => {
    await autosave.resolveConflict('reload');
    window.location.reload();
  };

  const handBack = (field: CupboardField): void => {
    setValue(field, toForm(baseline)[field] as never, { shouldDirty: true });
    if (field !== 'label' && field !== 'description' && field !== 'safetyNotes') {
      // A list's typing box is part of the answer it is handing back.
      if (field !== 'elements') setValue(`drafts.${field}`, '');
    }
    setHandedBack((current) => new Set(current).add(field));
    clearErrors(field);
  };

  const submit = async (): Promise<void> => {
    try {
      await saveAll();
      onDone();
    } catch {
      // The refusal is beside its field or in the alert; the form stays open.
    }
  };

  /** "Restore Original", at the end of a field's label row while the coven says its own. */
  const useCompendium = (field: CupboardField, label: string): ReactElement | undefined =>
    isOwn(field, values, baseline, overrides, handed) ? (
      <IconTip tip="Restore Original" placement="below">
        <button
          type="button"
          className="field__label-action"
          aria-label={`Restore Original: ${label}`}
          onClick={() => handBack(field)}
        >
          <UndoIcon />
        </button>
      </IconTip>
    ) : undefined;

  const textField = (field: TextField, multiline: boolean): ReactElement => {
    const { label, hint, placeholder } = TEXT[field];
    const { aria, ...shell } = fieldDescription({
      id: `${id}-${field}`,
      hint,
      error: errors[field]?.message,
    });
    const common = {
      id: shell.controlId,
      placeholder: field === 'label' ? compendium.name : placeholder,
      ...aria,
      ...register(field),
    };
    return (
      <FieldShell
        key={field}
        label={label}
        hint={hint}
        {...shell}
        action={useCompendium(field, label)}
      >
        {multiline ? (
          <textarea className="textarea" rows={field === 'description' ? 7 : 3} {...common} />
        ) : (
          <input className="input" type="text" autoComplete="off" {...common} />
        )}
      </FieldShell>
    );
  };

  /** A list's legend row carries "Restore Original" beside its info tip. */
  const handBackAction = (field: CupboardField, label: string) => () => useCompendium(field, label);

  return (
    <FormProvider {...methods}>
      <FormHistoryContext.Provider value={history}>
        <form
          ref={form}
          className="form cupboard-form"
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
          noValidate
        >
          {alert && <Notice kind="error">{alert}</Notice>}
          <FormHistoryButtons />
          {textField('label', false)}
          {textField('description', true)}
          {textField('safetyNotes', true)}
          <MultiSelectField
            name="elements"
            label="Elements"
            hint={listHint('elements')}
            placeholder="Add an element"
            options={ELEMENT_OPTIONS}
            action={useCompendium('elements', 'Elements')}
          />
          <LookupListField
            workspaceId={workspaceId}
            useSuggestions={useCelestialBodySuggestions}
            name="celestialBodies"
            ordered
            legend="Celestial Bodies"
            entry="Celestial Body"
            hint={listHint('heavenly bodies')}
            placeholder="Add a body"
            action={handBackAction('celestialBodies', 'Celestial Bodies')}
          />
          <LookupListField
            workspaceId={workspaceId}
            useSuggestions={useZodiacSuggestions}
            name="zodiacSigns"
            ordered
            legend="Zodiac Signs"
            entry="Zodiac Sign"
            hint={listHint('signs')}
            placeholder="Add a sign"
            action={handBackAction('zodiacSigns', 'Zodiac Signs')}
          />
          <ListField
            name="colors"
            ordered
            legend="Colours"
            entry="Colour"
            hint={listHint('colours', ' in a working, not the colour it is')}
            placeholder="Add a colour"
            action={handBackAction('colors', 'Colours')}
          />
          <FormActions
            noun="Annotation"
            dirty={dirty}
            submitting={save.isPending}
            aside={aside?.({ onRefused: setAlert, dirty, discardAsking: false })}
          >
            <SaveStatus
              status={autosave.status}
              savedAt={autosave.savedAt}
              conflictMessage="This entry was changed elsewhere."
              conflictInto={headerNote}
              onRetry={autosave.retry}
              onReload={() => void reload()}
              onKeepMine={() => void autosave.resolveConflict('keep-mine').catch(() => undefined)}
            />
          </FormActions>
        </form>
      </FormHistoryContext.Provider>
    </FormProvider>
  );
};

export default CupboardEntryForm;
