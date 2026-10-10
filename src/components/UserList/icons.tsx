import type { ReactElement } from 'react';

// The table's marks: a check and a cross for a yes-or-no column, and the
// primary admin's crown. Hidden from assistive technology; the word beside a
// check or cross, or the crown's own name, carries it.

export function CheckIcon(): ReactElement {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <path
        d="M3 8.5l3.5 3.5L13 4.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function CrossIcon(): ReactElement {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/** A crown: the primary admin, set by the site's configuration. */
export function CrownIcon(): ReactElement {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <path
        d="M2.5 5.5 5 9l3-5.5L11 9l2.5-3.5-1 6.5h-9zM3.5 14h9"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
