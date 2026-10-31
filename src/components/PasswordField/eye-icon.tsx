import type { ReactElement } from 'react';

// The show-password toggle's mark, on the section nav's conventions: a 24-unit square, a 1.6 stroke with
// round ends, no fill, in `currentColor`. An open eye while the password is hidden; struck through once
// shown. Hidden from assistive technology, since the button around it names it.
export function EyeIcon({ shown }: { shown: boolean }): ReactElement {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2.5 12C4.5 7.8 8 5.5 12 5.5s7.5 2.3 9.5 6.5c-2 4.2-5.5 6.5-9.5 6.5S4.5 16.2 2.5 12z" />
      <circle cx="12" cy="12" r="3" />
      {shown && <path d="M4 4l16 16" />}
    </svg>
  );
}
