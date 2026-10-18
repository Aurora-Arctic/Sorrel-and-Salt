'use client';

import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { type FormEvent, type ReactElement, useId, useState } from 'react';
import { graphql } from '../../gql';
import { graphqlRequest } from '../../lib/graphql-client';
import { readGraphqlIssues } from '../../lib/graphql-failure';
import { ComboboxMultiSelect } from '../Combobox';
import { FieldShell, FormActions, fieldDescription } from '../Field';
import { ELEMENT_OPTIONS } from '../IngredientForm/options';
import { DiscardQuestion, useDiscardGuard } from '../Modal';
import Notice from '../Notice';
import { FIELDS, baselineOf, changesOf, isOwn, openingValues } from './changes';
import ListInput from './list-input';
import type {
  CupboardEntryFormProps,
  CupboardField,
  CupboardValues,
  ListFieldName,
  TextField,
} from './types';
import './index.scss';

// The coven's override form for a compendium entry it holds (M12.17): seven
// fields, each showing the coven's own value or the compendium's, each with
// a "Use the Compendium's" that hands the field back. Plain state rather than
// react-hook-form, because the form must tell null (the compendium's) from an
// empty list (the coven cleared it), and a form library's array cannot
// (claude-docs/components/cupboard-entry-form.md).

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

const TEXT: Record<TextField, { label: string; hint: string; placeholder: string }> = {
  label: {
    label: 'Label',
    hint: "What your coven calls this entry. It stands in for the Compendium's name on your pages, and no two entries in a coven share one.",
    placeholder: 'Add a label',
  },
  description: {
    label: 'Description',
    hint: "Your coven's own description, in place of the Compendium's.",
    placeholder: 'Add a description',
  },
  safetyNotes: {
    label: 'Safety Notes',
    hint: "Your coven's own safety notes, in place of the Compendium's.",
    placeholder: 'Add safety notes',
  },
};

const LISTS: Record<
  Exclude<ListFieldName, 'elements'>,
  { label: string; entry: string; hint: string; placeholder: string }
> = {
  celestialBodies: {
    label: 'Celestial Bodies',
    entry: 'Celestial Body',
    hint: 'The heavenly bodies your coven ties it to. An empty list says it has none.',
    placeholder: 'Add a body',
  },
  zodiacSigns: {
    label: 'Zodiac Signs',
    entry: 'Zodiac Sign',
    hint: 'The signs your coven ties it to. An empty list says it has none.',
    placeholder: 'Add a sign',
  },
  colors: {
    label: 'Colours',
    entry: 'Colour',
    hint: 'The colours your coven ties it to in a working. An empty list says it has none.',
    placeholder: 'Add a colour',
  },
};

const ERRORS_BY_FIELD = (path: readonly (string | number)[]): CupboardField | undefined => {
  // The input's own fields, with or without the argument's name before them.
  const [first, second] = path[0] === 'input' ? path.slice(1) : path;
  return FIELDS.find((field) => field === first) && second === undefined
    ? (first as CupboardField)
    : undefined;
};

const CupboardEntryForm = ({
  workspaceId,
  ingredientId,
  compendium,
  overrides,
  onDone,
}: CupboardEntryFormProps): ReactElement => {
  const id = useId();
  const router = useRouter();
  const baseline = baselineOf(compendium);
  const [values, setValues] = useState<CupboardValues>(() => openingValues(baseline, overrides));
  const [handedBack, setHandedBack] = useState<ReadonlySet<CupboardField>>(new Set());
  const [errors, setErrors] = useState<Partial<Record<CupboardField, string>>>({});
  const [alert, setAlert] = useState<string>();

  const changes = changesOf(values, baseline, overrides, handedBack);
  const dirty = Object.keys(changes).length > 0;
  const discard = useDiscardGuard(dirty);

  const save = useMutation({
    mutationFn: () =>
      graphqlRequest(AnnotateCupboardEntryDocument, {
        workspaceId,
        ingredientId,
        input: changes,
      }),
  });

  const set = <Field extends CupboardField>(field: Field, value: CupboardValues[Field]): void => {
    setValues((current) => ({ ...current, [field]: value }));
    // A new answer for the field: no longer handed back, and its refusal is stale.
    setHandedBack((current) => {
      const next = new Set(current);
      next.delete(field);
      return next;
    });
    setErrors(({ [field]: _gone, ...rest }) => rest);
  };

  const handBack = (field: CupboardField): void => {
    setValues((current) => ({ ...current, [field]: baseline[field] }));
    setHandedBack((current) => new Set(current).add(field));
    setErrors(({ [field]: _gone, ...rest }) => rest);
  };

  const submit = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    setAlert(undefined);
    setErrors({});
    try {
      await save.mutateAsync();
      router.refresh();
      onDone();
    } catch (error) {
      const placed: Partial<Record<CupboardField, string>> = {};
      const unplaced: string[] = [];
      for (const { path, message } of readGraphqlIssues(error)) {
        const field = ERRORS_BY_FIELD(path);
        if (field) placed[field] = message;
        else unplaced.push(message);
      }
      setErrors(placed);
      if (unplaced.length > 0) setAlert(unplaced.join(' '));
      else if (Object.keys(placed).length === 0) setAlert("That didn't work. Please try again.");
    }
  };

  /** "Use the Compendium's", at the end of a field's label row while the coven says its own. */
  const useCompendium = (field: CupboardField, label: string): ReactElement | undefined =>
    isOwn(field, values, baseline, overrides, handedBack) ? (
      <button
        type="button"
        className="btn btn--quiet btn--small cupboard-form__reset"
        aria-label={`Use the Compendium's ${label}`}
        onClick={() => handBack(field)}
      >
        Use the Compendium&apos;s
      </button>
    ) : undefined;

  const textField = (field: TextField, multiline: boolean): ReactElement => {
    const { label, hint, placeholder } = TEXT[field];
    const { aria, ...shell } = fieldDescription({
      id: `${id}-${field}`,
      hint,
      error: errors[field],
    });
    const common = {
      id: shell.controlId,
      value: values[field],
      placeholder: field === 'label' ? compendium.name : placeholder,
      ...aria,
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
          <textarea
            className="textarea"
            rows={field === 'description' ? 7 : 3}
            {...common}
            onChange={(event) => set(field, event.target.value)}
          />
        ) : (
          <input
            className="input"
            type="text"
            autoComplete="off"
            {...common}
            onChange={(event) => set(field, event.target.value)}
          />
        )}
      </FieldShell>
    );
  };

  const elements = fieldDescription({
    id: `${id}-elements`,
    hint: 'The elements your coven ties it to. An empty list says it has none.',
    error: errors.elements,
  });
  const { aria: elementsAria, ...elementsShell } = elements;

  return (
    <form className="form" onSubmit={(event) => void submit(event)} noValidate>
      {alert && <Notice kind="error">{alert}</Notice>}
      {textField('label', false)}
      {textField('description', true)}
      {textField('safetyNotes', true)}
      <FieldShell
        label="Elements"
        hint="The elements your coven ties it to. An empty list says it has none."
        {...elementsShell}
        action={useCompendium('elements', 'Elements')}
      >
        <ComboboxMultiSelect
          id={elementsShell.controlId}
          label="Elements"
          labelId={elementsShell.labelId}
          values={values.elements}
          onChange={(next) => set('elements', next as CupboardValues['elements'])}
          choices={ELEMENT_OPTIONS}
          placeholder="Add an element"
          removeNoun="Element"
          {...elementsAria}
        />
      </FieldShell>
      {(Object.keys(LISTS) as Exclude<ListFieldName, 'elements'>[]).map((field) => {
        const { label, entry, hint, placeholder } = LISTS[field];
        return (
          <ListInput
            key={field}
            label={label}
            entry={entry}
            hint={hint}
            placeholder={placeholder}
            values={values[field]}
            onChange={(next) => set(field, next)}
            action={useCompendium(field, label)}
          />
        );
      })}
      <FormActions
        noun="Annotation"
        dirty={dirty}
        submitting={save.isPending}
        onCancel={() => discard.request(onDone)}
      />
      {discard.asking && <DiscardQuestion guard={discard} />}
    </form>
  );
};

export default CupboardEntryForm;
