import type { ReactElement } from 'react';
import './back-link.scss';

// Outside back-link.tsx, which is a client file, so a server-drawn "Back to …" link takes the chevron and its look
// without shipping the history-reading link.
// `up` points it up, for a link back to the top of the page; drawn, not rotated, so the hover's transform stays its own.
export function BackChevron({ direction = 'back' }: { direction?: 'back' | 'up' }): ReactElement {
  return (
    <svg viewBox="0 0 16 16" width="1em" height="1em" aria-hidden="true" focusable="false">
      <path
        d={direction === 'up' ? 'M3.5 10L8 5.5l4.5 4.5' : 'M10 3.5L5.5 8l4.5 4.5'}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
