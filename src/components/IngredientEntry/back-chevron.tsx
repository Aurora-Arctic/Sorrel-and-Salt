import type { ReactElement } from 'react';
import './back-link.scss';

// Outside back-link.tsx, which is a client file, so a server-drawn "Back to …" link takes the chevron and its look
// without shipping the history-reading link.
export function BackChevron(): ReactElement {
  return (
    <svg viewBox="0 0 16 16" width="1em" height="1em" aria-hidden="true" focusable="false">
      <path
        d="M10 3.5L5.5 8l4.5 4.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
