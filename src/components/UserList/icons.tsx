import type { ReactElement } from 'react';

// The table's two marks for a yes-or-no column, a check and a cross, and the
// history link's clock. Hidden from assistive technology: the cell carries
// the word beside a mark, and the link its own name.

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

/** A clock with a counter-clockwise arrow round it: a user's privilege history. */
export function HistoryIcon(): ReactElement {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <path
        d="M2.75 8a5.25 5.25 0 1 1 1.54 3.71M1.25 6.5 2.75 8l1.5-1.5M8 5v3l2 1.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
