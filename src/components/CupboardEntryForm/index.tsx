'use client';

import { usePendingNavigation } from '../../lib/navigation';
import { useMutation } from '@tanstack/react-query';
import { type ReactElement, useId, useRef, useState } from 'react';
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
import { DiscardQuestion, useDiscardGuard } from '../Modal';
import Notice from '../Notice';
import { FIELDS, differs, baselineOf, changesOf, isOwn, openingValues } from './changes';
import { fromForm, toForm, type CupboardFormValues } from './form-values';
import type { CupboardEntryFormProps, CupboardField, TextField } from './types';
import './index.scss';

// The coven's override form for a compendium entry it holds: seven fields, each with a "Restore
// Original", on react-hook-form. Null (the compendium's) and an empty list (cleared) are told apart in
// `changes.ts` (claude-docs/components/cupboard-entry-form.md).

const AnnotateCupboardEntryDocument = graphql(`
  mutation AnnotateCupboardEntry(
    $workspaceId: ID!
    $ingredientId: ID!
    $input: CupboardEntryInput!
  ) {
    annotateCupboardEntry(workspaceId: $workspaceId, ingredientId: $ingredientId, input: $input) {
      id
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

const TEXT_FIELD_NAMES: readonly CupboardField[] = ['label', 'description', 'safetyNotes'];
const LIST_BOX = ['celestialBodies', 'zodiacSigns', 'colors'] as const;

const CupboardEntryForm = ({
  workspaceId,
  ingredientId,
  compendium,
  overrides,
  onDone,
  aside,
}: CupboardEntryFormProps): ReactElement => {
  const id = useId();
  const { refresh } = usePendingNavigation();
  const form = useRef<HTMLFormElement>(null);
  const baseline = baselineOf(compendium);
  const methods = useForm<CupboardFormValues>({
    defaultValues: toForm(openingValues(baseline, overrides)),
  });
  const { control, register, handleSubmit, setValue, setError, clearErrors, formState } = methods;
  const { errors } = formState;
  const [handedBack, setHandedBack] = useState<ReadonlySet<CupboardField>>(new Set());
  const [alert, setAlert] = useState<string>();

  const values = fromForm(useWatch({ control }) as CupboardFormValues);
  // A field stays handed back only while it still holds the compendium's: a
  // new answer, or an undo, ends it.
  const handed = new Set([...handedBack].filter((field) => !differs(field, values, baseline)));
  const changes = changesOf(values, baseline, overrides, handed);
  const dirty = Object.keys(changes).length > 0;
  const discard = useDiscardGuard(dirty);
  const history = useFormHistory(methods, { root: form, enabled: !discard.asking });

  const save = useMutation({
    mutationFn: (input: typeof changes) =>
      graphqlRequest(AnnotateCupboardEntryDocument, { workspaceId, ingredientId, input }),
  });

  const handBack = (field: CupboardField): void => {
    setValue(field, toForm(baseline)[field] as never, { shouldDirty: true });
    if (field !== 'label' && field !== 'description' && field !== 'safetyNotes') {
      // A list's typing box is part of the answer it is handing back.
      if (field !== 'elements') setValue(`drafts.${field}`, '');
    }
    setHandedBack((current) => new Set(current).add(field));
    clearErrors(field);
  };

  const submit = handleSubmit(async (held) => {
    setAlert(undefined);
    // Text left in a list's box is an entry the person meant to add.
    const settled = { ...held };
    for (const list of LIST_BOX) {
      const text = held.drafts[list].trim();
      if (text !== '') settled[list] = [...held[list], { value: text }];
    }
    const sent = changesOf(fromForm(settled), baseline, overrides, handed);
    try {
      await save.mutateAsync(sent);
      refresh();
      onDone();
    } catch (error) {
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
    }
  });

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
          onSubmit={(event) => void submit(event)}
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
            onCancel={() => discard.request(onDone)}
            aside={aside?.({ onRefused: setAlert, dirty, discardAsking: discard.asking })}
          />
          {discard.asking && <DiscardQuestion guard={discard} />}
        </form>
      </FormHistoryContext.Provider>
    </FormProvider>
  );
};

export default CupboardEntryForm;
