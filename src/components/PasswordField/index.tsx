'use client';

import { type ReactElement, useId, useState } from 'react';
import { FieldShell, fieldDescription } from '../Field';
import { StrengthMeter } from './meter';
import type { PasswordFieldProps } from './types';
import './index.scss';

// One password control: the browser's own autocomplete, a show-password toggle, and, for a new
// password, the strength meter. Nothing here blocks paste or caps the length; the server's rules
// are the only ones (claude-docs/components/password-field.md).
const PasswordField = ({
  label,
  value,
  onChange,
  purpose,
  error,
  required,
}: PasswordFieldProps): ReactElement => {
  const id = useId();
  const [shown, setShown] = useState(false);
  const meterId = `${id}-strength`;
  const { aria, ...field } = fieldDescription({
    id,
    error,
    describedBy: purpose === 'new' ? meterId : undefined,
  });

  return (
    <FieldShell
      label={label}
      required={required}
      {...field}
      action={
        // A fixed name with its pressed state, rather than a name that flips, so a screen reader
        // hears one control that is on or off.
        <button
          type="button"
          className="btn btn--quiet btn--small password-field__toggle"
          aria-label={`Show ${label}`}
          aria-pressed={shown}
          aria-controls={field.controlId}
          onClick={() => setShown((was) => !was)}
        >
          {shown ? 'Hide' : 'Show'}
        </button>
      }
      after={purpose === 'new' ? <StrengthMeter password={value} id={meterId} /> : undefined}
    >
      <input
        id={field.controlId}
        className="input"
        type={shown ? 'text' : 'password'}
        autoComplete={purpose === 'new' ? 'new-password' : 'current-password'}
        // Shown text is still a password: no spelling or capital fix-ups.
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        placeholder={purpose === 'new' ? 'New password' : 'Your password'}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-required={required || undefined}
        {...aria}
      />
    </FieldShell>
  );
};

export default PasswordField;
