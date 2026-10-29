import { type ReactElement, useRef, useState } from 'react';
import {
  Controller,
  FormProvider,
  type ResolverResult,
  type UseFormReturn,
  useFieldArray,
  useForm,
} from 'react-hook-form';
import {
  FormHistoryButtons,
  FormHistoryContext,
  SelectField,
  TextField,
  useFormHistory,
} from '@/components/Field';
import type { FormHistory, UseFormHistoryOptions } from '@/components/Field/types';

// A small react-hook-form form for the undo and redo tests: a text
// field, a select, a list of rows in a fieldset with a legend, and a field
// inside a folded `<details>` that `onRestored` opens. It is wired as the
// admin forms are: the hook, its `ref` on the `<form>`, the provider and
// `FormHistoryButtons` inside it, and a Save that follows `isDirty`.

export interface ProbeValues {
  title: string;
  kind: string;
  items: { value: string }[];
  note: string;
  level: number;
}

const START: ProbeValues = {
  title: 'Fixture',
  kind: 'one',
  items: [{ value: 'first' }, { value: 'second' }],
  note: '',
  level: 0,
};

const KINDS = [
  { value: 'one', label: 'One' },
  { value: 'two', label: 'Two' },
  { value: 'three', label: 'Three' },
];

export interface ProbeHandles {
  methods: UseFormReturn<ProbeValues>;
  history: FormHistory;
}

interface ProbeProps {
  enabled?: boolean;
  ignore?: (target: HTMLElement) => boolean;
  onRestored?: UseFormHistoryOptions['onRestored'];
  skip?: (name: string) => boolean;
  /** Handed the form and its history on every render. */
  onHandles?: (handles: ProbeHandles) => void;
  /** Draws a combobox that is open, for a chord inside one. */
  openCombobox?: boolean | 'highlighted';
  /** Draws the Undo and Redo buttons. */
  buttons?: boolean;
  /** The rows the list starts with. */
  items?: ProbeValues['items'];
}

export function HistoryProbe({
  enabled,
  ignore,
  skip,
  onRestored,
  onHandles,
  openCombobox,
  buttons = true,
  items,
}: ProbeProps): ReactElement {
  const methods = useForm<ProbeValues>({
    defaultValues: items ? { ...START, items } : START,
    // Title is required, so a restore to blank is invalid.
    resolver: (values): ResolverResult<ProbeValues> =>
      values.title
        ? { values, errors: {} }
        : { values: {}, errors: { title: { type: 'required', message: 'Title is required' } } },
  });
  const { control, handleSubmit, formState } = methods;
  const root = useRef<HTMLFormElement>(null);
  const [folded, setFolded] = useState(false);
  const history = useFormHistory(methods, {
    root,
    enabled,
    ignore,
    skip,
    onRestored: (names, diffs, direction) => {
      if (names.includes('note')) setFolded(true);
      return onRestored?.(names, diffs, direction);
    },
  });
  const list = useFieldArray({ control, name: 'items' });
  onHandles?.({ methods, history });

  return (
    <FormProvider {...methods}>
      <FormHistoryContext.Provider value={history}>
        <form ref={root} onSubmit={handleSubmit(() => undefined)}>
          {buttons && <FormHistoryButtons />}
          <TextField<ProbeValues> name="title" label="Title" required />
          <SelectField<ProbeValues>
            name="kind"
            label="Kind"
            options={KINDS}
            // A pick that sets another field in the same turn, as the
            // ingredient form's nomenclature empties its formal name.
            onChange={(value) => {
              if (value === 'three') methods.setValue('title', '', { shouldDirty: true });
            }}
          />
          <fieldset>
            <legend>Items</legend>
            {list.fields.map((row, at) => (
              <div key={row.id}>
                <TextField<ProbeValues> name={`items.${at}.value`} label={`Item ${at + 1}`} />
                <button type="button" onClick={() => list.remove(at)}>
                  {`Remove Item ${at + 1}`}
                </button>
              </div>
            ))}
            <button type="button" onClick={() => list.append({ value: 'added' })}>
              Add Item
            </button>
          </fieldset>
          <details open={folded} onToggle={(event) => setFolded(event.currentTarget.open)}>
            <summary>More</summary>
            <TextField<ProbeValues> name="note" label="Note" />
          </details>
          {openCombobox && (
            <>
              <input
                role="combobox"
                aria-expanded="true"
                aria-controls="open-box-list"
                aria-activedescendant={openCombobox === 'highlighted' ? 'open-box-option' : ''}
                aria-label="Open Box"
                readOnly
              />
              <datalist id="open-box-list" aria-label="Open Box Options" />
            </>
          )}
          {/* A slider-like control: every pointer move raises the value, as the colour picker reports each move of a drag. */}
          <Controller
            control={control}
            name="level"
            render={({ field }) => (
              <div
                // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- a test fixture standing in for the real control
                role="slider"
                aria-label="Level"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={field.value}
                tabIndex={0}
                onPointerMove={() => field.onChange(field.value + 1)}
              />
            )}
          />
          <button type="button" onClick={() => methods.reset({ ...START, title: 'Reset' })}>
            Start Over
          </button>
          <button type="submit" disabled={!formState.isDirty}>
            Save
          </button>
        </form>
      </FormHistoryContext.Provider>
    </FormProvider>
  );
}
