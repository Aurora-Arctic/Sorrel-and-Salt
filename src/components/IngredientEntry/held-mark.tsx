import type { ReactElement } from 'react';
import { HELD_TIP } from '../AddIcon/wording';
import IconTip from '../IconTip';

// The shelf of two bottles before an entry's name, saying the coven's cupboard holds it: a button
// to carry its tip, outside the `h1`, that opens on hover, focus and press
// (claude-docs/components/ingredient-entry.md, "Component notes").
export const ShelfIcon = (): ReactElement => (
  <svg
    viewBox="0 0 32 32"
    width="1em"
    height="1em"
    aria-hidden="true"
    focusable="false"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M2.5 29H29.5" />
    <path d="M7 29L8.75 31.25M25 29L23.25 31.25" />
    {/* The cork first, tinted, so the neck and the lip run in front of it. */}
    <path
      d="M8.6 12L8.1 7.4Q8 6.7 8.7 6.7H10.3Q11 6.7 10.9 7.4L10.4 12Z"
      fill="currentColor"
      fillOpacity="0.35"
    />
    <path d="M8 9.2V12.8Q6 13.8 6 16V27H13V16Q13 13.8 11 12.8V9.2" />
    <path d="M7.2 9.2H11.8" />
    <path d="M20.5 9.5V16.4A5.4 5.4 0 1 0 23.5 16.4V9.5" />
    <path d="M19.2 9.5H24.8" />
    <path d="M17.4 21.2Q19.7 20.2 22 21.2T26.6 21.2" />
  </svg>
);

const HeldMark = (): ReactElement => (
  <IconTip tip={HELD_TIP} placement="above" opensOnPress>
    <button type="button" className="ingredient-entry__held" aria-label={HELD_TIP}>
      <ShelfIcon />
    </button>
  </IconTip>
);

export default HeldMark;
