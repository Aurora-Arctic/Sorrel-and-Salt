'use client';

import { type ChangeEvent, type FocusEvent, type ReactElement, useId } from 'react';
import Spinner from '../Spinner';
import { CharacterCount } from './character-count';
import { fieldDescription } from './description';
import { useMask } from './mask';
import { FieldShell } from './shell';
import { blurFormat, browserAttributes } from './text-control';
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
}: PlainTextFieldProps): ReactElement {
  const id = useId();
  const countId = useId();
  const { aria, ...description } = fieldDescription({
    id,
    hint,
    note,
    describedBy: [describedBy, limit && countId].filter(Boolean).join(' ') || undefined,
    error,
    invalid,
  });
  const blurFormatter = blurFormat({ format, multiline });
  const masked = useMask(multiline ? undefined : mask);
  const leave = (event: FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const formatted = blurFormatter?.(event.target.value) ?? event.target.value;
    if (formatted !== event.target.value) onChange(formatted);
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
      after={
        limit || after ? (
          <>
            {limit ? <CharacterCount id={countId} length={value.length} limit={limit} /> : null}
            {after}
          </>
        ) : undefined
      }
      {...description}
    >
      {multiline ? (
        <textarea className="textarea" rows={rows} {...control} />
      ) : busy === undefined ? (
        <input className="input" type={type} {...control} />
      ) : (
        <span className="field__control">
          <input className="input" type={type} aria-busy={busy || undefined} {...control} />
          {busy && <Spinner className="field__busy" />}
        </span>
      )}
    </FieldShell>
  );
}
