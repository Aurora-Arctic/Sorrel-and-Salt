import { type FocusEvent, type ReactElement, useId, useMemo, useRef, useState } from 'react';
import {
  type FieldPath,
  type FieldValues,
  type PathValue,
  get,
  useController,
  useFieldArray,
  useFormContext,
  useFormState,
  useWatch,
} from 'react-hook-form';
import Combobox, {
  ComboboxEntry,
  ComboboxMultiSelect,
  ComboboxSelect,
  ComboboxSortableEntries,
} from '../Combobox';
import type { ComboboxOption } from '../Combobox/types';
import InfoTip from '../InfoTip';
import type {
  AnyListEntry,
  FieldErrorProps,
  FieldShellProps,
  IngredientFormValues,
  ListFieldProps,
  ListOption,
  MultiSelectFieldProps,
  SelectFieldProps,
  SuggestFieldProps,
  TextFieldProps,
} from './types';
import { addEntry, commitDraft, entryDetail, entryText, repeatOf } from './values';

// IngredientForm's fields, on the form primitives (claude-docs/styling.md,
// "Form fields"). Each reads its own error out of the form state, so a field
// re-renders for its own error and not for every other field's. The text and
// select fields read whichever form provides them, so the reference panel's
// own form draws its fields and errors through the same ones (MB.154).

/** The one element a field's error renders through, whether the resolver found it or the server did. */
export function FieldError({ id, message }: FieldErrorProps): ReactElement | null {
  if (!message) return null;
  return (
    <p id={id} className="field__error">
      {message}
    </p>
  );
}

/**
 * A field's ids, its current error, and the attributes that tie the control
 * to its hint, note and error: `aria-describedby` makes each read with the
 * field — the hint too, though its tip is closed — and `aria-invalid` is what
 * draws the error edge, so one cannot ship without the other.
 */
function useField<V extends FieldValues>(
  name: FieldPath<V>,
  hint?: string,
  note?: string,
  describedBy?: string,
  invalid?: boolean,
) {
  const id = useId();
  const { errors } = useFormState<V>({ name });
  const error: string | undefined = get(errors, name)?.message;
  const hintId = `${id}-hint`;
  const noteId = `${id}-note`;
  const errorId = `${id}-error`;
  const description = [hint && hintId, note && noteId, describedBy, error && errorId]
    .filter(Boolean)
    .join(' ');
  return {
    controlId: `${id}-control`,
    labelId: `${id}-label`,
    hintId,
    noteId,
    errorId,
    error,
    aria: {
      'aria-invalid': error || invalid ? true : undefined,
      'aria-describedby': description || undefined,
    },
  };
}

function FieldShell({
  label,
  hint,
  note,
  required,
  controlId,
  labelId,
  hintId,
  noteId,
  errorId,
  error,
  children,
  after,
}: FieldShellProps): ReactElement {
  return (
    <div className="field">
      <div className="ingredient-form__label-row">
        <label className="field__label" id={labelId} htmlFor={controlId}>
          {label}
          {/* For the eye, hard against the label: "Name*". Hidden from the
              field's name, so a screen reader hears "Name" and the control's
              `aria-required` rather than "Name star". */}
          {required && (
            <span className="ingredient-form__required" aria-hidden="true">
              *
            </span>
          )}
        </label>
        {hint && (
          <InfoTip id={hintId} label={label}>
            {hint}
          </InfoTip>
        )}
      </div>
      {note && (
        <p className="field__hint" id={noteId}>
          {note}
        </p>
      )}
      {children}
      <FieldError id={errorId} message={error} />
      {after}
    </div>
  );
}

export function TextField<V extends FieldValues = IngredientFormValues>({
  name,
  label,
  hint,
  note,
  required,
  multiline,
  type,
  disabled,
  deps,
  describedBy,
  invalid,
  after,
  format,
}: TextFieldProps<V>): ReactElement {
  const { register, setValue, getFieldState } = useFormContext<V>();
  const { aria, ...field } = useField<V>(name, hint, note, describedBy, invalid);
  // Tidied as it is left, the way the server will store it (MB.154); an
  // error it was showing is judged again on the tidied text.
  const tidy = (event: FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const text = event.target.value;
    const formatted = format?.(text) ?? text;
    if (formatted === text) return;
    setValue(name, formatted as PathValue<V, FieldPath<V>>, {
      shouldDirty: true,
      shouldValidate: getFieldState(name).invalid,
    });
  };
  // The attribute, not register's `disabled`, which would also drop the value
  // from what is validated and sent: the form decides that itself. And
  // `aria-required` rather than `required`, whose `:invalid` would mark an
  // empty field before anyone has tried to save.
  const control = {
    id: field.controlId,
    disabled,
    'aria-required': required || undefined,
    ...aria,
    ...register(name, { deps, onBlur: format ? tidy : undefined }),
  };
  return (
    <FieldShell label={label} hint={hint} note={note} required={required} after={after} {...field}>
      {multiline ? (
        <textarea className="textarea" {...control} />
      ) : (
        <input className="input" type={type} {...control} />
      )}
    </FieldShell>
  );
}

/**
 * A text field whose box suggests as it is typed in (DESIGN.md §14): a pick
 * fills the field with the suggestion's value, and free text stays as typed,
 * with no warning. What a pick links is the caller's, told of each pick
 * and each edit, and what it adds to the box is its qualifier.
 */
export function SuggestField<O extends ComboboxOption = ComboboxOption>({
  name,
  label,
  hint,
  suggestions,
  onActivate,
  onPick,
  onEdit,
  qualifier,
}: SuggestFieldProps<O>): ReactElement {
  const { control } = useFormContext<IngredientFormValues>();
  const { field } = useController({ control, name });
  const { aria, ...shell } = useField<IngredientFormValues>(name, hint);
  return (
    <FieldShell label={label} hint={hint} {...shell}>
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
        inputRef={field.ref}
        name={field.name}
        {...aria}
      />
    </FieldShell>
  );
}

/**
 * A closed set, on the combobox's select-only box (DESIGN.md §14): the same
 * control and list as a suggesting field, with nothing to type.
 */
export function SelectField<V extends FieldValues = IngredientFormValues>({
  name,
  label,
  hint,
  placeholder,
  options,
  required,
  deps,
  onChange,
}: SelectFieldProps<V>): ReactElement {
  const { control } = useFormContext<V>();
  const { field } = useController({ control, name, rules: { deps } });
  const { aria, ...shell } = useField<V>(name, hint);
  return (
    <FieldShell label={label} hint={hint} required={required} {...shell}>
      <ComboboxSelect
        id={shell.controlId}
        label={label}
        labelId={shell.labelId}
        value={field.value}
        // Before the field and its `deps` revalidate: None empties the formal
        // name first, so its error is judged on the empty value.
        onChange={(value) => {
          onChange?.(value);
          field.onChange(value);
        }}
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
 * A closed set holding several values, on the combobox's multi-select box:
 * the select-only box, its choices as chips inside the control, as a list's
 * entries are. Nothing is typed and nothing is added by a button, so it is a
 * field, labelled and erring as one, rather than a list's fieldset.
 */
export function MultiSelectField({
  name,
  label,
  hint,
  placeholder,
  options,
  required,
}: MultiSelectFieldProps): ReactElement {
  const { control } = useFormContext<IngredientFormValues>();
  const { field } = useController({ control, name });
  const { aria, ...shell } = useField<IngredientFormValues>(name, hint);
  return (
    <FieldShell label={label} hint={hint} required={required} {...shell}>
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
 * A list of free-text entries: one combobox to type in, with each entry added
 * shown inside it ahead of the text. A box with a source suggests, and a pick
 * adds as Add does. An error naming an entry marks that entry and reads out
 * on the box, through the list's one error element. An ordered list's entries
 * move, each by its handle. A repeat is refused at the box, as the save
 * would refuse it, and never suggested (MB.174).
 */
export function ListField({
  name,
  legend,
  entry,
  hint,
  suggestions,
  onActivate,
  ordered,
}: ListFieldProps): ReactElement {
  const form = useFormContext<IngredientFormValues>();
  const { control, trigger, setError, clearErrors, getFieldState, getValues } = form;
  const { fields, remove, move } = useFieldArray({ control, name });
  const box = `drafts.${name}` as const;
  const { field } = useController({ control, name: box });
  const { errors, isSubmitted } = useFormState({ control, name: [name, box] });
  const id = useId();
  // Its own ref rather than setFocus, which waits a tick: the box never
  // unmounts, so it can take the focus at once.
  const boxElement = useRef<HTMLInputElement | null>(null);
  // The box and its button together, which an open list spans (MB.154).
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
        options: suggestions.options.filter(
          (option) => !repeatOf(listed, option.value, option.link, nameToRefuse),
        ),
      },
    [suggestions, listed, nameToRefuse],
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
  // Gone once the text it judged is changed, or something is added.
  const clearRefusal = () => {
    if (getFieldState(box).error?.type === 'repeat') clearErrors(box);
  };
  const added = (value: string | undefined) => {
    if (value !== undefined) {
      clearRefusal();
      setAnnouncement(`Added ${value}`);
      revalidate();
    }
    focusBox();
  };
  // Add, and Enter with no suggestion picked, add what the box holds; a pick
  // adds the suggestion's value, linked when the suggestion is an ingredient.
  // Add refuses a repeat; a pick never is one, since the lookup leaves out
  // what the list holds and withholds the typed row for a repeat.
  const add = () => {
    if (!refused(getValues(box))) added(commitDraft(form, name));
  };
  const pick = (value: string, option: ListOption | null) =>
    added(addEntry(form, name, value, option?.link));
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

  // Keyed by the field array's id, which follows an entry through a move.
  const chips = fields.map((row, index) => ({
    id: row.id,
    value: entryText(row),
    detail: entryDetail(row),
    errorId: entryErrors[index] && errorId,
    onRemove: () => {
      setAnnouncement(`Removed ${entryText(row)}`);
      remove(index);
      revalidate();
      // The pressed x is about to go; the box keeps the focus.
      focusBox();
    },
  }));
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
      <legend className="fieldset__legend ingredient-form__label-row">
        <span id={legendId}>{legend}</span>
        {hint && (
          <InfoTip id={hintId} label={legend}>
            {hint}
          </InfoTip>
        )}
      </legend>
      <div ref={setBoxRow} className="ingredient-form__row">
        <Combobox
          id={boxId}
          label={entry}
          value={field.value}
          onChange={(text) => {
            clearRefusal();
            field.onChange(text);
          }}
          onFocus={onActivate}
          onBlur={field.onBlur}
          onPick={pick}
          onCommit={add}
          onRemoveLast={removeLast}
          suggestions={offered}
          offerTyped={!repeat(field.value)}
          listAnchor={boxRow}
          entries={entries}
          clear={fields.length > 0 ? { label: `Clear ${legend}`, onClear: clear } : undefined}
          inputRef={(element) => {
            field.ref(element);
            boxElement.current = element;
          }}
          name={field.name}
          aria-invalid={message ? true : undefined}
          aria-describedby={describedBy || undefined}
        />
        <button type="button" className="btn" aria-label={`Add ${entry}`} onClick={add}>
          Add
        </button>
      </div>
      <FieldError id={errorId} message={message} />
      {/* Labelled, so that it is told from the box's own status region. */}
      <output className="visually-hidden" aria-label={`${legend} changes`}>
        {announcement}
      </output>
    </fieldset>
  );
}
