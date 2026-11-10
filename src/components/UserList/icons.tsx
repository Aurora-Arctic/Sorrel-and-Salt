import type { ReactElement } from 'react';

// The table's own marks: the history link's clock, the primary keeper's crown and
// the email & password and passkey logins, hidden from assistive technology since
// each carries its own name beside it. A yes-or-no column's check and cross are the shared set's.

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

export function EmailPasswordIcon(): ReactElement {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <path
        d="M12.5 7.5V5a1 1 0 0 0-1-1h-9a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h5.25M2.5 5.25 7 8.5l4.5-3.25M10.25 11.5v-1a1.75 1.75 0 0 1 3.5 0v1M9.5 11.5h5v3h-5z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function PasskeyIcon(): ReactElement {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <path
        d="M2.5 10.5V8a5.5 5.5 0 0 1 11 0v2.5M5.5 13V8a2.5 2.5 0 0 1 5 0v5M8 9.5v4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
