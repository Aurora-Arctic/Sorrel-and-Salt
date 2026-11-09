'use client';

import { type FocusEvent, type ReactElement, useId } from 'react';
import {
  type FieldPath,
  type FieldValues,
  type PathValue,
  useFormContext,
  useWatch,
} from 'react-hook-form';
import { limitMessage } from '../../lib/formats';
import Spinner from '../Spinner';
import { CharacterCount } from './character-count';
import { FieldShell } from './shell';
import { blurFormat, browserAttributes } from './text-control';
import type { TextFieldProps } from './types';
import { useField } from './use-field';

function WatchedCount<V extends FieldValues>({
  id,
  name,
  limit,
}: {
  id: string;
  name: FieldPath<V>;
  limit: number;
}): ReactElement {
  // Read here, not in TextField, so only a limited field re-renders on each keystroke.
  const value: unknown = useWatch<V>({ name });
  return (
    <CharacterCount id={id} length={typeof value === 'string' ? value.length : 0} limit={limit} />
  );
}

export function TextField<V extends FieldValues = FieldValues>({
  name,
  label,
  labelSuffix,
  hint,
  note,
  required,
  placeholder,
  multiline,
  rows,
  type,
  inputMode,
  disabled,
  deps,
  describedBy,
  invalid,
  after,
  action,
  format,
  limit,
  autoComplete,
  spellCheck,
  autoCapitalize,
  enterKeyHint,
  busy,
}: TextFieldProps<V>): ReactElement {
  const { register, setValue } = useFormContext<V>();
  const countId = useId();
  const { aria, ...field } = useField<V>(
    name,
    hint,
    note,
    [describedBy, limit && countId].filter(Boolean).join(' ') || undefined,
    invalid,
  );
  const blurFormatter = blurFormat({ format, multiline });
  const tidy = (event: FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const text = event.target.value;
    const formatted = blurFormatter?.(text) ?? text;
    if (formatted === text) return;
    setValue(name, formatted as PathValue<V, FieldPath<V>>, {
      shouldDirty: true,
      shouldValidate: true,
    });
  };
  // The attribute, not register's `disabled`, which would drop the value from validation and sending. And
  // `aria-required`, not `required`, whose `:invalid` would mark an empty field before a save is tried.
  const control = {
    id: field.controlId,
    disabled,
    placeholder,
    ...browserAttributes({
      type,
      multiline,
      inputMode,
      autoComplete,
      spellCheck,
      autoCapitalize,
      enterKeyHint,
    }),
    'aria-required': required || undefined,
    ...aria,
    ...register(name, {
      deps,
      onBlur: blurFormatter ? tidy : undefined,
      // A form with a resolver ignores this: its schema carries the limit (claude-docs/components/field.md, "Text fields").
      validate: limit
        ? (value: unknown) =>
            typeof value !== 'string' || value.length <= limit || limitMessage(limit)
        : undefined,
    }),
  };
  return (
    <FieldShell
      label={label}
      labelSuffix={labelSuffix}
      hint={hint}
      note={note}
      required={required}
      after={
        limit || after ? (
          <>
            {limit ? <WatchedCount<V> id={countId} name={name} limit={limit} /> : null}
            {after}
          </>
        ) : undefined
      }
      action={action}
      {...field}
    >
      {multiline ? (
        <textarea className="textarea" rows={rows} {...control} />
      ) : busy === undefined ? (
        <input className="input" type={type} {...control} />
      ) : (
        // A field that looks its text up (the name's duplicate check) shows a spinner at the input's right end
        // and marks the input busy; wrapped only when the caller says, so other fields keep a bare input.
        <span className="field__control">
          <input className="input" type={type} aria-busy={busy || undefined} {...control} />
          {busy && <Spinner className="field__busy" />}
        </span>
      )}
    </FieldShell>
  );
}
