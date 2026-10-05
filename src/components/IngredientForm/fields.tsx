import { type KeyboardEvent, type ReactElement, useId, useRef, useState } from 'react';
import { type FieldPath, get, useFieldArray, useFormContext, useFormState } from 'react-hook-form';
import InfoTip from '../InfoTip';
import type {
  EntryChipProps,
  FieldErrorProps,
  FieldShellProps,
  IngredientFormValues,
  ListFieldProps,
  SelectFieldProps,
  TextFieldProps,
} from './types';
import { commitDraft } from './values';

// IngredientForm's fields, on the form primitives (claude-docs/styling.md,
// "Form fields"). Each reads its own error out of the form state, so a field
// re-renders for its own error and not for every other field's.

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
function useField(name: FieldPath<IngredientFormValues>, hint?: string, note?: string) {
  const id = useId();
  const { errors } = useFormState<IngredientFormValues>({ name });
  const error: string | undefined = get(errors, name)?.message;
  const hintId = `${id}-hint`;
  const noteId = `${id}-note`;
  const errorId = `${id}-error`;
  const describedBy = [hint && hintId, note && noteId, error && errorId].filter(Boolean).join(' ');
  return {
    controlId: `${id}-control`,
    hintId,
    noteId,
    errorId,
    error,
    aria: {
      'aria-invalid': error ? true : undefined,
      'aria-describedby': describedBy || undefined,
    },
  };
}

function FieldShell({
  label,
  hint,
  note,
  required,
  controlId,
  hintId,
  noteId,
  errorId,
  error,
  children,
}: FieldShellProps): ReactElement {
  return (
    <div className="field">
      <div className="ingredient-form__label-row">
        <label className="field__label" htmlFor={controlId}>
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
    </div>
  );
}

export function TextField({
  name,
  label,
  hint,
  note,
  required,
  multiline,
  disabled,
  deps,
}: TextFieldProps): ReactElement {
  const { register } = useFormContext<IngredientFormValues>();
  const { aria, ...field } = useField(name, hint, note);
  // The attribute, not register's `disabled`, which would also drop the value
  // from what is validated and sent: the form decides that itself. And
  // `aria-required` rather than `required`, whose `:invalid` would mark an
  // empty field before anyone has tried to save.
  const control = {
    id: field.controlId,
    disabled,
    'aria-required': required || undefined,
    ...aria,
    ...register(name, { deps }),
  };
  return (
    <FieldShell label={label} hint={hint} note={note} required={required} {...field}>
      {multiline ? (
        <textarea className="textarea" {...control} />
      ) : (
        <input className="input" {...control} />
      )}
    </FieldShell>
  );
}

/** A closed set, as a native `<select>` (DESIGN.md §14). */
export function SelectField({
  name,
  label,
  hint,
  placeholder,
  none,
  options,
  required,
  deps,
  onChange,
}: SelectFieldProps): ReactElement {
  const { register } = useFormContext<IngredientFormValues>();
  const { aria, ...field } = useField(name, hint);
  const control = register(name, {
    deps,
    onChange: onChange && ((event: { target: { value: string } }) => onChange(event.target.value)),
  });
  return (
    <FieldShell label={label} hint={hint} required={required} {...field}>
      <select
        className="select"
        id={field.controlId}
        aria-required={required || undefined}
        {...aria}
        {...control}
      >
        {/* A placeholder is shown until a choice is made, and cannot be made
            itself; `none` is a choice, the one that clears the field. */}
        {placeholder !== undefined && (
          <option value="" disabled hidden>
            {placeholder}
          </option>
        )}
        {none !== undefined && <option value="">{none}</option>}
        {options.map(({ value, label: text }) => (
          <option key={value} value={value}>
            {text}
          </option>
        ))}
      </select>
    </FieldShell>
  );
}

/** An entry added to a list: its text, and the x that takes it out. */
function EntryChip({ value, errorId, onRemove }: EntryChipProps): ReactElement {
  return (
    <li className={errorId ? 'ingredient-form__entry is-invalid' : 'ingredient-form__entry'}>
      {value}
      {/* Named for its entry: a column of bare "Remove"s is no help to a screen reader. */}
      <button
        type="button"
        className="ingredient-form__remove"
        aria-label={`Remove ${value}`}
        aria-describedby={errorId}
        onClick={onRemove}
      >
        <span aria-hidden="true">×</span>
      </button>
    </li>
  );
}

/**
 * A list of free-text entries: one box to type in, and each entry added shown
 * above it. An error naming an entry marks that entry and reads out on the
 * box, through the list's one error element.
 */
export function ListField({ name, legend, entry, hint }: ListFieldProps): ReactElement {
  const form = useFormContext<IngredientFormValues>();
  const { control, register, trigger } = form;
  const { fields, remove } = useFieldArray({ control, name });
  const box = `drafts.${name}` as const;
  const { errors, isSubmitted } = useFormState({ control, name: [name, box] });
  const id = useId();
  // Its own ref rather than setFocus, which waits a tick: the box never
  // unmounts, so it can take the focus at once.
  const boxElement = useRef<HTMLInputElement | null>(null);
  // What the last add or removal did, for a screen reader: the box empties
  // and an entry appears or goes, and neither is otherwise announced.
  const [announcement, setAnnouncement] = useState('');
  const legendId = `${id}-legend`;
  const boxId = `${id}-box`;
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const { ref: registerBox, ...boxProps } = register(box);
  const focusBox = () => boxElement.current?.focus();

  const entryErrors = fields.map(
    (_, index): string | undefined => get(errors, `${name}.${index}.value`)?.message,
  );
  const boxError: string | undefined = get(errors, box)?.message;
  const message = [
    ...fields.flatMap(({ value }, index) =>
      entryErrors[index] ? [`${value}: ${entryErrors[index]}`] : [],
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
  const add = () => {
    const added = commitDraft(form, name);
    if (added !== undefined) {
      setAnnouncement(`Added ${added}`);
      revalidate();
    }
    focusBox();
  };
  const addOnEnter = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter' || event.nativeEvent.isComposing) return;
    // Enter in a text box would otherwise submit the whole form.
    event.preventDefault();
    add();
  };

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
      {fields.length > 0 && (
        <ul className="ingredient-form__entries">
          {fields.map((row, index) => (
            <EntryChip
              key={row.id}
              value={row.value}
              errorId={entryErrors[index] && errorId}
              onRemove={() => {
                setAnnouncement(`Removed ${row.value}`);
                remove(index);
                revalidate();
                // The pressed x is about to go; the box keeps the focus.
                focusBox();
              }}
            />
          ))}
        </ul>
      )}
      <div className="ingredient-form__row">
        <input
          id={boxId}
          className="input"
          aria-label={entry}
          aria-invalid={message ? true : undefined}
          aria-describedby={describedBy || undefined}
          onKeyDown={addOnEnter}
          ref={(element) => {
            registerBox(element);
            boxElement.current = element;
          }}
          {...boxProps}
        />
        <button type="button" className="btn" aria-label={`Add ${entry}`} onClick={add}>
          Add
        </button>
      </div>
      <FieldError id={errorId} message={message} />
      <output className="visually-hidden">{announcement}</output>
    </fieldset>
  );
}
