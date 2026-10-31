'use client';

import { type ReactElement, useId, useState } from 'react';
import { FieldShell, fieldDescription } from '../Field';
import { EyeIcon } from './eye-icon';
import { StrengthMeter } from './meter';
import { PASSWORD_RULES } from './rules';
import type { PasswordFieldProps } from './types';
import './index.scss';

// One password control: the browser's own autocomplete, an eye toggle inside the field, and, for a new
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
  // The meter is advice and a refusal is the verdict, so a refused password shows no meter.
  const metered = purpose === 'new' && !error;
  const { aria, ...field } = fieldDescription({
    id,
    error,
    hint: purpose === 'new' ? PASSWORD_RULES : undefined,
    describedBy: metered ? meterId : undefined,
  });

  return (
    <FieldShell
      label={label}
      required={required}
      hint={purpose === 'new' ? PASSWORD_RULES : undefined}
      {...field}
      after={metered ? <StrengthMeter password={value} id={meterId} /> : undefined}
    >
      <div className="password-field__control">
        <input
          id={field.controlId}
          className="input"
          type={shown ? 'text' : 'password'}
          autoComplete={purpose === 'new' ? 'new-password' : 'current-password'}
          // Shown text is still a password: no spelling or capital fix-ups.
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          placeholder={purpose === 'new' ? 'Add a password' : 'Enter password'}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          aria-required={required || undefined}
          {...aria}
        />
        {/* A fixed name with its pressed state, rather than a name that flips, so a screen reader
            hears one control that is on or off. */}
        <button
          type="button"
          className="password-field__toggle"
          aria-label={`Show ${label}`}
          aria-pressed={shown}
          aria-controls={field.controlId}
          onClick={() => setShown((was) => !was)}
        >
          <EyeIcon shown={shown} />
        </button>
      </div>
    </FieldShell>
  );
};

export default PasswordField;
