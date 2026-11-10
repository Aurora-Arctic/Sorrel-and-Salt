'use client';

import type { ReactElement } from 'react';
import { emailAddressProblem, emailFormat } from '../../lib/email-address';
import { PlainTextField } from './plain-text-field';
import type { PlainTextFieldProps } from './types';

type EmailFieldProps = Omit<PlainTextFieldProps, 'type' | 'format' | 'check' | 'label'> & {
  label?: string;
};

/** An email address in a plain-state form: tidied when the box is left and checked against the one address rule. */
export function EmailField({
  label = 'Email Address',
  required = true,
  placeholder = 'name@example.com',
  ...rest
}: EmailFieldProps): ReactElement {
  return (
    <PlainTextField
      {...rest}
      label={label}
      required={required}
      placeholder={placeholder}
      type="email"
      autoCapitalize="none"
      spellCheck={false}
      format={emailFormat}
      check={emailAddressProblem}
    />
  );
}
