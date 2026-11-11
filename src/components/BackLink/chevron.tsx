import type { ReactElement } from 'react';
import './index.scss';

// Beside the link and outside IngredientEntry's client one, so a server-drawn "Back to …" link takes the chevron and its look
// without shipping the history-reading link.
// `up` points it up, for a link back to the top of the page, and `forward` the other way, for a next page; drawn, not
// rotated, so the hover's transform stays its own.
const PATHS = {
  back: 'M10 3.5L5.5 8l4.5 4.5',
  up: 'M3.5 10L8 5.5l4.5 4.5',
  forward: 'M6 3.5L10.5 8 6 12.5',
} as const;

export function BackChevron({
  direction = 'back',
}: {
  direction?: keyof typeof PATHS;
}): ReactElement {
  return (
    <svg viewBox="0 0 16 16" width="1em" height="1em" aria-hidden="true" focusable="false">
      <path
        d={PATHS[direction]}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
