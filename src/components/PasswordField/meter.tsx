'use client';

import { type ReactElement, useEffect, useState } from 'react';
import type { PasswordStrength } from './types';

/** Each zxcvbn score's word, weakest first. */
export const STRENGTH_WORDS = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong'] as const;

// zxcvbn's estimate of what is typed, loaded on the first keystroke rather than with the page. It
// advises and never refuses: the server's length and breached-list checks are the only gate.
export function StrengthMeter({ password, id }: { password: string; id: string }): ReactElement {
  const [strength, setStrength] = useState<PasswordStrength>();

  useEffect(() => {
    if (password === '') return;
    let current = true;
    void import('./strength').then(({ passwordStrength }) => {
      if (current) setStrength(passwordStrength(password));
    });
    return () => {
      current = false;
    };
  }, [password]);

  const shown = password === '' ? undefined : strength;
  return (
    // The bar and the text line are always drawn, the line at the height of one line (the
    // warnings are short enough never to wrap), so the first keystroke moves nothing below. The bar is decoration; only the text is read.
    <div className="password-field__strength">
      <meter
        className="password-field__bar"
        min={0}
        max={4}
        low={2}
        high={3}
        optimum={4}
        value={shown?.score ?? 0}
        aria-hidden
      />
      {/* Polite, so a screen reader hears the verdict after the keystroke rather than over it; empty
          until there is a verdict, so nothing is announced for it. */}
      <p className="field__hint password-field__strength-text" id={id} aria-live="polite">
        {shown && (
          <>
            <span className="password-field__strength-label">Strength:</span>{' '}
            {STRENGTH_WORDS[shown.score]}
            {shown.warning && `. ${shown.warning}`}
          </>
        )}
      </p>
    </div>
  );
}
