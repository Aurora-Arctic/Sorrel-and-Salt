'use client';

import { type ChangeEvent, type FocusEvent, type ReactElement, useId } from 'react';
import {
  type FieldPath,
  type FieldValues,
  type PathValue,
  useFormContext,
  useWatch,
} from 'react-hook-form';
import { limitMessage } from '../../lib/formats';
import { CharacterCount } from './character-count';
import { useMask } from './mask';
import { FieldShell } from './shell';
import {
  afterCount,
  blurFormat,
  browserAttributes,
  describedByWithCount,
  TextControl,
} from './text-control';
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
  mask,
  limit,
  autoComplete,
  spellCheck,
  autoCapitalize,
  enterKeyHint,
  autoFocus,
  ignorePasswordManagers,
  busy,
}: TextFieldProps<V>): ReactElement {
  const { register, setValue, getFieldState } = useFormContext<V>();
  const countId = useId();
  const { aria, ...field } = useField<V>(
    name,
    hint,
    note,
    describedByWithCount(describedBy, limit, countId),
    invalid,
  );
  const blurFormatter = blurFormat({ format, multiline });
  const masked = useMask(multiline ? undefined : mask);
  const tidy = (event: FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const text = event.target.value;
    const formatted = blurFormatter?.(text) ?? text;
    if (formatted === text) return;
    setValue(name, formatted as PathValue<V, FieldPath<V>>, {
      shouldDirty: true,
      // Tidied to nothing: the blur check ran on the text before it, so check again.
      shouldValidate: getFieldState(name).invalid || formatted === '',
    });
  };
  const registered = register(name, {
    deps,
    onBlur: blurFormatter ? tidy : undefined,
    // A form with a resolver ignores this: its schema carries the limit (claude-docs/components/field.md, "Text fields").
    validate: limit
      ? (value: unknown) =>
          typeof value !== 'string' || value.length <= limit || limitMessage(limit)
      : undefined,
  });
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
      autoFocus,
      ignorePasswordManagers,
    }),
    'aria-required': required || undefined,
    ...aria,
    ...registered,
    onFocus: masked.onFocus,
    onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      masked.mask(event);
      return registered.onChange(event);
    },
  };
  return (
    <FieldShell
      label={label}
      labelSuffix={labelSuffix}
      hint={hint}
      note={note}
      required={required}
      after={afterCount(
        limit ? <WatchedCount<V> id={countId} name={name} limit={limit} /> : null,
        after,
      )}
      action={action}
      {...field}
    >
      <TextControl multiline={multiline} rows={rows} type={type} busy={busy} control={control} />
    </FieldShell>
  );
}
