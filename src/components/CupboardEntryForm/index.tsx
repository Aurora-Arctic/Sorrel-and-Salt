'use client';

import { usePendingNavigation, reportLeaving } from '../../lib/navigation';
import { useMutation } from '@tanstack/react-query';
import { type ReactElement, useRef, useState } from 'react';
import { GraphQLClientError, StaleWriteError } from '../../lib/graphql-client-error';
import { useAutosave, type SaveContext, type SaveResult } from '../../lib/autosave';
import { FormProvider, useForm, useWatch } from 'react-hook-form';
import { graphql } from '@/lib/graphql-document';
import { graphqlRequest } from '../../lib/graphql-client';
import { placeServerIssues } from '../../lib/graphql-failure';
import {
  FormActions,
  FormErrorSummary,
  FormHistoryButtons,
  FormHistoryContext,
  TextField as FormTextField,
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
import {
  FIELDS,
  differs,
  isTextField,
  baselineOf,
  changesOf,
  isOwn,
  openingValues,
} from './changes';
import { fromForm, toForm, type CupboardFormValues } from './form-values';
import type {
  CupboardChanges,
  CupboardEntryFormProps,
  CupboardField,
  CupboardOverrides,
  TextField,
} from './types';
import './index.scss';

// The coven's override form for a compendium entry it holds: seven fields, each with a "Restore Original". Null (the
// compendium's) and an empty list (cleared) are told apart in `changes.ts`; it saves as it is edited
// (claude-docs/components/cupboard-entry-form.md, claude-docs/autosave.md).

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

// A field keeps a tip only for a rule its label does not say (claude-docs/components/info-tip.md,
// "When a field gets a tip").
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
    placeholder: 'Add notes',
  },
};

const listHint = (things: string, how = ''): string =>
  `The ${things} your coven ties it to${how}, in place of the Compendium's. An empty list says it has none.`;

const placeOf = (
  path: readonly (string | number)[],
): { field: CupboardField; at?: number } | undefined => {
  // The input's own fields, with or without the argument's name before them.
  const [first, second] = path[0] === 'input' ? path.slice(1) : path;
  const field = FIELDS.find((name) => name === first);
  if (!field) return undefined;
  return { field, at: typeof second === 'number' ? second : undefined };
};

const hasDrafts = (drafts: Record<string, string>): boolean =>
  Object.values(drafts).some((text) => text.trim() !== '');

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
  const { refresh } = usePendingNavigation();
  const form = useRef<HTMLFormElement>(null);
  const baseline = baselineOf(compendium);
  const [overrides, setOverrides] = useState<CupboardOverrides>(opened);
  const overridesRef = useRef(overrides);
  const revisionRef = useRef<number | null>(revision);
  const methods = useForm<CupboardFormValues>({
    defaultValues: toForm(openingValues(baseline, opened)),
    // The summary takes the focus on a failed Save, so the form's own focus must not take it back.
    shouldFocusError: false,
  });
  const { control, setValue, getValues, setError, clearErrors } = methods;
  const [handedBack, setHandedBack] = useState<ReadonlySet<CupboardField>>(new Set());
  const [alert, setAlert] = useState<string>();

  const values = fromForm(useWatch({ control }) as CupboardFormValues);
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

  const placeRefusal = (error: unknown): void => {
    const placed = placeServerIssues(
      error,
      (name, issue) => (name === 'root' ? setAlert(issue.message) : setError(name as never, issue)),
      ({ path }) => {
        const where = placeOf(path);
        if (!where) return undefined;
        const { field, at } = where;
        if (field === 'elements' || isTextField(field)) return field;
        return at !== undefined ? `${field}.${at}.value` : `drafts.${field}`;
      },
    );
    if (!placed) setAlert("That didn't work. Please try again.");
  };

  /**
   * The one save the autosave, Save and Close go through. It writes against the revision the
   * server last answered with; only Keep My Version names another. A refusal is thrown for the
   * autosave to report.
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
   * Resolves only once everything typed is on the server, else throws: the pending autosave, then
   * any text left in a list's box.
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

  const reload = async (): Promise<void> => {
    await autosave.resolveConflict('reload');
    reportLeaving();
    window.location.reload();
  };

  const handBack = (field: CupboardField): void => {
    setValue(field, toForm(baseline)[field] as never, { shouldDirty: true });
    if (field !== 'label' && field !== 'description' && field !== 'safetyNotes') {
      if (field !== 'elements') setValue(`drafts.${field}`, '');
    }
    setHandedBack((current) => new Set(current).add(field));
    clearErrors(field);
  };

  // Through handleSubmit, which counts the Save for the error summary; a refusal is placed beside its field
  // by persist, so the form stays open and the catch is empty.
  const submit = methods.handleSubmit(async () => {
    try {
      await saveAll();
      onDone();
    } catch {}
  });

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
    return (
      <FormTextField<CupboardFormValues>
        key={field}
        name={field}
        label={label}
        hint={hint}
        placeholder={field === 'label' ? compendium.name : placeholder}
        multiline={multiline}
        rows={multiline ? (field === 'description' ? 7 : 3) : undefined}
        autoComplete="off"
        action={useCompendium(field, label)}
      />
    );
  };

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
          <FormErrorSummary />
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
