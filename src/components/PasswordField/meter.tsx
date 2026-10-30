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
    // Polite, so a screen reader hears the verdict after the keystroke rather than over it.
    <p className="field__hint" id={id} aria-live="polite">
      {shown && (
        <>
          <meter min={0} max={4} low={2} high={3} optimum={4} value={shown.score} aria-hidden />{' '}
          Strength: {STRENGTH_WORDS[shown.score]}
          {shown.warning && `. ${shown.warning}`}
        </>
      )}
    </p>
  );
}
