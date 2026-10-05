import { type KeyboardEvent, type ReactElement, useEffect, useId, useRef, useState } from 'react';
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
import { commitDraft, entryText } from './values';

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

// Long enough to cross from the pill onto its tooltip.
const ENTRY_TIP_CLOSE_DELAY_MS = 150;

/**
 * An entry added to a list: its text, and the x that takes it out. A text too
 * long for the column is cut off with an ellipsis, and shown whole in a
 * tooltip while the entry is hovered or its x has focus — only when it is cut
 * off, and closed by Escape (WCAG 1.4.13).
 */
function EntryChip({ value, errorId, onRemove }: EntryChipProps): ReactElement {
  const text = useRef<HTMLSpanElement | null>(null);
  const [open, setOpen] = useState(false);
  const closing = useRef<ReturnType<typeof setTimeout>>(undefined);
  // Measured as it opens rather than watched: whether the text fits changes
  // with the column, and only matters at the moment someone looks.
  const show = () => {
    clearTimeout(closing.current);
    const element = text.current;
    if (element && element.scrollWidth > element.clientWidth) setOpen(true);
  };
  const hide = () => {
    clearTimeout(closing.current);
    setOpen(false);
  };
  // As InfoTip's: long enough for the pointer to cross from the pill onto the
  // tooltip above it, whose hover keeps it open.
  const hideSoon = () => {
    clearTimeout(closing.current);
    closing.current = setTimeout(() => setOpen(false), ENTRY_TIP_CLOSE_DELAY_MS);
  };

  useEffect(() => () => clearTimeout(closing.current), []);

  useEffect(() => {
    if (!open) return;
    // On the document: a tooltip opened by hover has no focus to listen from.
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open]);

  return (
    <li className={errorId ? 'ingredient-form__entry is-invalid' : 'ingredient-form__entry'}>
      {/* Hover on a wrapper holding the tooltip as well as the text, so the
          pointer can move onto the tooltip without closing it. */}
      <span className="ingredient-form__entry-label" onMouseEnter={show} onMouseLeave={hideSoon}>
        <span ref={text} className="ingredient-form__entry-text">
          {value}
        </span>
        {/* In the page while closed, faded out and aria-hidden, so it fades
            both ways as InfoTip's does. */}
        <span
          role="tooltip"
          className={open ? 'ingredient-form__entry-tip is-open' : 'ingredient-form__entry-tip'}
          aria-hidden={!open}
        >
          {value}
        </span>
      </span>
      {/* Named for its entry: a column of bare "Remove"s is no help to a screen reader. */}
      <button
        type="button"
        className="ingredient-form__remove"
        aria-label={`Remove ${value}`}
        aria-describedby={errorId}
        onFocus={show}
        onBlur={hide}
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
              value={entryText(row)}
              errorId={entryErrors[index] && errorId}
              onRemove={() => {
                setAnnouncement(`Removed ${entryText(row)}`);
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
