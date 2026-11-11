'use client';

import { type ChangeEvent, type FocusEvent, type ReactElement, useId, useState } from 'react';
import { CharacterCount } from './character-count';
import { fieldDescription } from './description';
import { useMask } from './mask';
import { FieldShell } from './shell';
import {
  afterCount,
  blurFormat,
  browserAttributes,
  describedByWithCount,
  TextControl,
} from './text-control';
import type { PlainTextFieldProps } from './types';

/**
 * `TextField` for a form that holds its values in state: the same shell, props, tidy-on-blur default,
 * soft limit and browser attributes, with the caller holding `value` and `error`
 * (claude-docs/components/field.md, "Text fields").
 */
export function PlainTextField({
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
  value,
  onChange,
  onBlur,
  error,
  check,
}: PlainTextFieldProps): ReactElement {
  const id = useId();
  const [problem, setProblem] = useState<string>();
  const [rechecking, setRechecking] = useState(false);
  const recheck = (text: string) => {
    const found = text === '' ? undefined : check?.(text);
    setProblem(found);
    return found;
  };
  const countId = useId();
  const { aria, ...description } = fieldDescription({
    id,
    hint,
    note,
    describedBy: describedByWithCount(describedBy, limit, countId),
    error: error ?? problem,
    invalid,
  });
  const blurFormatter = blurFormat({ format, multiline });
  const masked = useMask(multiline ? undefined : mask);
  const leave = (event: FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const formatted = blurFormatter?.(event.target.value) ?? event.target.value;
    if (formatted !== event.target.value) onChange(formatted);
    if (recheck(formatted)) setRechecking(true);
    onBlur?.();
  };
  const control = {
    id: description.controlId,
    name,
    value,
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
    onFocus: masked.onFocus,
    onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      masked.mask(event);
      // A caller's error counts as shown, as react-hook-form re-checks on change after a failed Save.
      if (rechecking || error) {
        setRechecking(true);
        recheck(event.target.value);
      }
      onChange(event.target.value);
    },
    onBlur: leave,
  };
  return (
    <FieldShell
      label={label}
      labelSuffix={labelSuffix}
      hint={hint}
      note={note}
      required={required}
      action={action}
      after={afterCount(
        limit ? <CharacterCount id={countId} length={value.length} limit={limit} /> : null,
        after,
      )}
      {...description}
    >
      <TextControl multiline={multiline} rows={rows} type={type} busy={busy} control={control} />
    </FieldShell>
  );
}
