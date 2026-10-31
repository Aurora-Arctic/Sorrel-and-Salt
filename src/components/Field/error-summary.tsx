'use client';

import { type MouseEvent, type ReactElement, useEffect, useRef } from 'react';
import type { ErrorSummaryProps } from './types';

// The list at the top of a form that names every problem a send found, each linked to the field it is about, in the
// style of GOV.UK's error summary. It takes the focus when it mounts, so a form shows one by keying it to the attempt
// (claude-docs/components/field.md, "Error summary").

const CONTROLS = 'input, textarea, select';

/** Moves the focus to the control an id names, or to the first one inside a group that carries the id. */
function focusTarget(id: string): void {
  const target = document.getElementById(id);
  if (!target) return;
  const control = target.matches(CONTROLS) ? target : target.querySelector<HTMLElement>(CONTROLS);
  (control ?? target).focus();
}

export function ErrorSummary({ errors }: ErrorSummaryProps): ReactElement {
  const summary = useRef<HTMLDivElement>(null);
  useEffect(() => {
    summary.current?.focus();
  }, []);

  function go(event: MouseEvent<HTMLAnchorElement>, target: string) {
    event.preventDefault();
    focusTarget(target);
  }

  return (
    <div ref={summary} className="notice notice--error" role="alert" tabIndex={-1}>
      <p>There is a problem</p>
      <ul>
        {errors.map((error) => (
          <li key={error.target}>
            <a href={`#${error.target}`} onClick={(event) => go(event, error.target)}>
              {error.message}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
