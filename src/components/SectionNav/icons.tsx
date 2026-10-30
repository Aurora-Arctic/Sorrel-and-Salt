import type { ReactElement } from 'react';
import { SPOON } from '../FormIcon';
import type { SectionIconName } from './types';

// The section navs' icons on a 24-unit square, 1.6 stroke, round ends, no fill, so they take the
// link's colour. Inline: nine shapes used nowhere else. Hidden from assistive technology
// (claude-docs/components/section-nav.md, "Contracts").
const SHAPES: Record<SectionIconName | 'more', ReactElement> = {
  overview: (
    <>
      <rect x="4" y="4" width="6.5" height="6.5" rx="1.5" />
      <rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5" />
      <rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5" />
      <rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5" />
    </>
  ),
  ingredients: (
    <>
      <path d="M5 19C5 10.5 10.5 5 19.5 4.5 19 13.5 13.5 19 5 19z" />
      <path d="M5 19l8.5-8.5" />
      <path d="M9.5 14.5h4M12 12V8.5" />
    </>
  ),
  grimoire: (
    <>
      <path d="M12 7C10 5.5 7 5 4 5.5v13c3-.5 6 0 8 1.5 2-1.5 5-2 8-1.5v-13c-3-.5-6 0-8 1.5z" />
      <path d="M12 7v13" />
      <path d="M7 9.5c1 0 2 .2 2.5.5M14.5 10c.5-.3 1.5-.5 2.5-.5" />
    </>
  ),
  members: (
    <>
      <circle cx="9" cy="8" r="3" />
      <path d="M3.5 19.5a5.5 5.5 0 0 1 11 0" />
      <circle cx="16.5" cy="9" r="2.5" />
      <path d="M16.5 14a4 4 0 0 1 4 4.5" />
    </>
  ),
  compendium: (
    <>
      <rect x="3.5" y="4" width="4.5" height="16" rx="1" />
      <rect x="10" y="4" width="4.5" height="16" rx="1" />
      <path d="M3.5 8h4.5M10 8h4.5M3.5 16h4.5M10 16h4.5" />
      <path d="M16.6 5.4l3.3-.8 2.6 14.6-3.3.8z" />
    </>
  ),
  categories: (
    <>
      <path d="M4 4h7.5l8.5 8.5-7.5 7.5L4 11.5z" />
      <circle cx="8.3" cy="8.3" r="1.5" />
    </>
  ),
  forms: SPOON,
  deities: <path d="M12 3.5l2 6.5 6.5 2-6.5 2-2 6.5-2-6.5-6.5-2 6.5-2z" />,
  astrology: (
    <>
      <path d="M19.5 14.5A7.5 7.5 0 1 1 9.5 4.5a6 6 0 0 0 10 10z" />
      <path d="M17.5 3.5v4M15.5 5.5h4" />
    </>
  ),
  people: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <circle cx="9" cy="10.8" r="2" />
      <path d="M5.8 16.2a3.2 3.2 0 0 1 6.4 0" />
      <path d="M14.5 10h3.5M14.5 13.5h3.5" />
    </>
  ),
  // The More button's mark: three dots, each a zero-length stroke the round
  // caps swell into a dot.
  more: <path strokeWidth="3" d="M6 12h.01M12 12h.01M18 12h.01" />,
};

const SectionIcon = ({ name }: { name: SectionIconName | 'more' }): ReactElement => (
  <svg
    className="section-nav__icon"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    {SHAPES[name]}
  </svg>
);

export default SectionIcon;
