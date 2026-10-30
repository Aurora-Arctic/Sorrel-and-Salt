import { type ReactElement, useId, useMemo, useRef, useState } from 'react';
import {
  get,
  useController,
  useFieldArray,
  useFormContext,
  useFormState,
  useWatch,
} from 'react-hook-form';
import Combobox, { ComboboxEntry, ComboboxMultiSelect, ComboboxSortableEntries } from '../Combobox';
import type { ComboboxOption } from '../Combobox/types';
import { FieldError, FieldShell, SwitchField, useField } from '../Field';
import InfoTip from '../InfoTip';
import { substituteSummary } from './substitute-summary';
import type {
  AnyListEntry,
  IngredientFormValues,
  ListFieldProps,
  ListOption,
  MultiSelectFieldProps,
  SubstituteListEntry,
  SuggestFieldProps,
  ToggleFieldProps,
} from './types';
import {
  NAME_ONLY,
  addEntry,
  commitDraft,
  draftOf,
  entryDetail,
  entryText,
  holdsSubstitutes,
  repeatOf,
} from './values';

// IngredientForm's own fields, on the shared field shell (../Field, claude-docs/components/
// field.md). Each reads its own error out of the form state, so a field re-renders for its own
// error alone. CupboardEntryForm also imports ListField and MultiSelectField.

/**
 * A text field whose box suggests as it is typed in (DESIGN.md §14): a pick fills the field with
 * the suggestion's value, and free text stays as typed. What a pick links is the caller's, told of
 * each pick and each edit; what it adds to the box is its qualifier.
 */
export function SuggestField<O extends ComboboxOption = ComboboxOption>({
  name,
  label,
  hint,
  placeholder,
  suggestions,
  onActivate,
  onPick,
  onEdit,
  qualifier,
  icon,
  typedIcon,
  offerTyped,
  note,
  after,
}: SuggestFieldProps<O>): ReactElement {
  const { control } = useFormContext<IngredientFormValues>();
  const { field } = useController({ control, name });
  const { aria, ...shell } = useField<IngredientFormValues>(name, hint, note);
  return (
    <FieldShell label={label} hint={hint} note={note} after={after} {...shell}>
      <Combobox
        id={shell.controlId}
        label={label}
        labelId={shell.labelId}
        value={field.value}
        onChange={(text) => {
          field.onChange(text);
          onEdit?.(text);
        }}
        onFocus={onActivate}
        onBlur={field.onBlur}
        onPick={(value, option) => {
          field.onChange(value);
          onPick?.(option);
        }}
        suggestions={suggestions}
        qualifier={qualifier}
        icon={icon}
        typedIcon={typedIcon}
        offerTyped={offerTyped}
        placeholder={placeholder}
        inputRef={field.ref}
        name={field.name}
        {...aria}
      />
    </FieldShell>
  );
}

/**
 * A closed set holding several values, on the combobox's multi-select box, its choices as chips
 * inside the control. Nothing is typed or added by a button, so it is a field, labelled and erring
 * as one, rather than a list's fieldset.
 */
export function MultiSelectField({
  name,
  label,
  hint,
  placeholder,
  options,
  required,
  action,
}: MultiSelectFieldProps): ReactElement {
  const { control } = useFormContext<IngredientFormValues>();
  const { field } = useController({ control, name });
  const { aria, ...shell } = useField<IngredientFormValues>(name, hint);
  return (
    <FieldShell label={label} hint={hint} required={required} action={action} {...shell}>
      <ComboboxMultiSelect
        id={shell.controlId}
        label={label}
        labelId={shell.labelId}
        values={field.value}
        onChange={field.onChange}
        onBlur={field.onBlur}
        choices={options}
        placeholder={placeholder}
        required={required}
        inputRef={field.ref}
        {...aria}
      />
    </FieldShell>
  );
}

/**
 * An on-or-off flag held in the form: the shared slide toggle, bound to the
 * form state rather than submitting by itself, since the form sends its
 * values as one input. It cannot be wrong, so it has no error.
 */
export function ToggleField({ name, label, hint }: ToggleFieldProps): ReactElement {
  const { control } = useFormContext<IngredientFormValues>();
  const { field } = useController({ control, name });
  return (
    <SwitchField
      label={label}
      name={field.name}
      value="1"
      checked={field.value}
      onChange={field.onChange}
      disabled={field.disabled}
      hint={hint}
    />
  );
}

/**
 * A list of free-text entries: one combobox to type in, each entry shown inside it. A pick adds as
 * Add does. An error naming an entry marks it and reads out on the list's one error element. An
 * ordered list's entries move by their handles. A repeat is refused at the box and never suggested.
 */
export function ListField({
  name,
  legend,
  entry,
  hint,
  placeholder,
  suggestions,
  onActivate,
  ordered,
  pickOnly,
  action,
  after,
  rowAction,
  workspaceId = null,
}: ListFieldProps): ReactElement {
  const form = useFormContext<IngredientFormValues>();
  const { control, trigger, setError, clearErrors, getFieldState, getValues } = form;
  const { fields, remove, move } = useFieldArray({ control, name });
  const box = draftOf(name);
  const { field } = useController({ control, name: box });
  const text = field.value as string;
  const { errors, isSubmitted } = useFormState({ control, name: [name, box] });
  const id = useId();
  // Its own ref rather than setFocus, which waits a tick: the box never
  // unmounts, so it can take the focus at once.
  const boxElement = useRef<HTMLInputElement | null>(null);
  // The box and its button together, which an open list spans.
  // Held as state, through its callback ref, so the box is told once it exists.
  const [boxRow, setBoxRow] = useState<HTMLDivElement | null>(null);
  // What the last add or removal did, for a screen reader: the box empties
  // and an entry appears or goes, and neither is otherwise announced.
  const [announcement, setAnnouncement] = useState('');
  const legendId = `${id}-legend`;
  const boxId = `${id}-box`;
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const focusBox = () => boxElement.current?.focus();

  // What the list holds, and for folk names the name, which a repeat is
  // judged against: watched only there, so Name's typing redraws no other list.
  const listed: AnyListEntry[] = useWatch({ control, name });
  const ingredientName = useWatch({ control, name: 'name', disabled: name !== 'folkNames' });
  const nameToRefuse = name === 'folkNames' ? ingredientName : undefined;
  const repeat = (text: string) => repeatOf(listed, text, undefined, nameToRefuse);
  // The lookup leaves out what the list holds, as the References search does.
  const offered = useMemo(
    () =>
      suggestions && {
        ...suggestions,
        options: suggestions.options
          .filter(
            (option) =>
              // A pick-only list offers the curated rows alone: a value only in
              // use is one the compendium refuses.
              !(pickOnly && option.curated === false) &&
              !repeatOf(listed, option.value, option.link, nameToRefuse),
          )
          // And lists them flat: with every row the compendium's, a From
          // Compendium heading over them would tell the admin nothing.
          .map((option) => (pickOnly ? { ...option, curated: undefined } : option)),
      },
    [suggestions, listed, nameToRefuse, pickOnly],
  );

  const entryErrors = fields.map(
    (_, index): string | undefined => get(errors, `${name}.${index}.value`)?.message,
  );
  const boxError: string | undefined = get(errors, box)?.message;
  const message = [
    ...fields.flatMap((row, index) =>
      entryErrors[index] ? [`${entryText(row)}: ${entryErrors[index]}`] : [],
    ),
    boxError,
  ]
    .filter(Boolean)
    .join(' ');
  const describedBy = [hint && hintId, message && errorId].filter(Boolean).join(' ');

  // Once a submit has shown errors, a change to the list revalidates it and
  // its box, as an edit to any other field does: adding empties the box.
  const revalidate = () => {
    if (isSubmitted) void trigger([name, box]);
  };
  // A repeat refused at the box: its text stays, to be put right, and the
  // list's error element says why, where the save's refusal would read.
  const refused = (text: string) => {
    const why = repeat(text);
    if (!why) return false;
    setError(box, { type: 'repeat', message: why });
    setAnnouncement(why);
    focusBox();
    return true;
  };
  // A pick-only list's Enter on text it has not picked from: refused at the
  // box as a repeat is, the text kept to search on.
  const unpicked = (text: string) => {
    if (text.trim() === '') return;
    const why = `Pick "${text.trim()}" from the list`;
    setError(box, { type: 'unpicked', message: why });
    setAnnouncement(why);
    focusBox();
  };
  // Gone once the text it judged is changed, or something is added.
  const clearRefusal = () => {
    const type = getFieldState(box).error?.type;
    if (type === 'repeat' || type === 'unpicked') clearErrors(box);
  };
  const added = (value: string | undefined) => {
    if (value !== undefined) {
      clearRefusal();
      setAnnouncement(`Added ${value}`);
      revalidate();
    }
    focusBox();
  };
  // Add, and Enter with no suggestion picked, add what the box holds; a pick adds the suggestion's
  // value, linked when it is an ingredient. Add refuses a repeat; a pick never is one, since the
  // lookup leaves out what the list holds and withholds the typed row for a repeat.
  const add = () => {
    if (!refused(getValues(box) as string)) added(commitDraft(form, name));
  };
  const pick = (value: string, option: ListOption | null) =>
    added(addEntry(form, name, value, option?.link, option?.variantId));
  const clear = () => {
    setAnnouncement(`Cleared ${legend}`);
    remove();
    revalidate();
    focusBox();
  };
  // Backspace in the empty box: the last entry goes, as its x would take it.
  const removeLast = () => {
    const last = fields[fields.length - 1];
    if (!last) return;
    setAnnouncement(`Removed ${entryText(last)}`);
    remove(fields.length - 1);
    revalidate();
  };

  // Keyed by the field array's id, which follows an entry through a move. Text and detail are read
  // from the watched values: the field array's rows are a snapshot that an entry's own field (a
  // substitute's form, picked beside the list) does not refresh.
  const substitutes = holdsSubstitutes(name);
  const chips = fields.map((row, index) => {
    const entry = listed[index] ?? row;
    const value = entryText(entry);
    const linked = substitutes && 'link' in entry && entry.link !== undefined;
    return {
      id: row.id,
      value,
      detail: entryDetail(entry),
      // A substitute's link opens its summary; its typed text is a name only.
      summary: linked
        ? substituteSummary(entry as SubstituteListEntry, value, workspaceId)
        : undefined,
      note: substitutes && !linked ? NAME_ONLY : undefined,
      action: rowAction?.(entry),
      errorId: entryErrors[index] && errorId,
      onRemove: () => {
        setAnnouncement(`Removed ${entryText(row)}`);
        remove(index);
        revalidate();
        // The pressed x is about to go; the box keeps the focus.
        focusBox();
      },
    };
  });
  // A move carries the entry's error with it, as the field array moves its
  // errors, and is said by the sortable list itself, so it leaves the
  // list's own announcement alone.
  const moveEntry = (from: number, to: number) => {
    move(from, to);
    revalidate();
  };

  const entries =
    fields.length > 0 &&
    (ordered ? (
      <ComboboxSortableEntries entries={chips} onMove={moveEntry} />
    ) : (
      <ul className="combobox__entries">
        {chips.map(({ id: key, ...chip }) => (
          <ComboboxEntry key={key} {...chip} />
        ))}
      </ul>
    ));

  return (
    // Named by the legend's text alone: the tip's button inside the legend
    // would otherwise join the group's name.
    <fieldset className="fieldset ingredient-form__list" aria-labelledby={legendId}>
      <legend className="fieldset__legend field__label-row">
        <span id={legendId}>{legend}</span>
        {hint && (
          <InfoTip id={hintId} label={legend}>
            {hint}
          </InfoTip>
        )}
        {action?.((said) => {
          setAnnouncement(said);
          revalidate();
        })}
      </legend>
      <div ref={setBoxRow} className="ingredient-form__row">
        <Combobox
          id={boxId}
          label={entry}
          value={text}
          onChange={(typed) => {
            clearRefusal();
            field.onChange(typed);
          }}
          onFocus={onActivate}
          onBlur={field.onBlur}
          onPick={pick}
          // Each pick adds an entry, so the list stays open for the next.
          keepOpen
          onCommit={pickOnly ? () => unpicked(getValues(box) as string) : add}
          onRemoveLast={removeLast}
          suggestions={offered}
          offerTyped={!pickOnly && !repeat(text)}
          placeholder={placeholder}
          listAnchor={boxRow}
          entries={entries}
          clear={{ label: `Clear ${legend}`, onClear: clear, empty: fields.length === 0 }}
          inputRef={(element) => {
            field.ref(element);
            boxElement.current = element;
          }}
          name={field.name}
          aria-invalid={message ? true : undefined}
          aria-describedby={describedBy || undefined}
        />
        {!pickOnly && (
          <button type="button" className="btn" aria-label={`Add ${entry}`} onClick={add}>
            Add
          </button>
        )}
      </div>
      <FieldError id={errorId} message={message} />
      {after}
      {/* Labelled, so that it is told from the box's own status region. */}
      <output className="visually-hidden" aria-label={`${legend} changes`}>
        {announcement}
      </output>
    </fieldset>
  );
}
