'use client';

import type { ReactElement } from 'react';
import { PlainTextField } from './plain-text-field';
import type { PlainTextFieldProps } from './types';

type CodeFieldProps = Omit<
  PlainTextFieldProps,
  'type' | 'inputMode' | 'autoComplete' | 'spellCheck' | 'placeholder' | 'label'
> & {
  label?: string;
};

/** The six-digit code from an authenticator app, in a plain-state form. */
export function CodeField({
  label = 'Code From Your App',
  required = true,
  ...rest
}: CodeFieldProps): ReactElement {
  return (
    <PlainTextField
      {...rest}
      label={label}
      required={required}
      placeholder="123456"
      inputMode="numeric"
      autoComplete="one-time-code"
      spellCheck={false}
    />
  );
}
