import type { ReactElement, ReactNode } from 'react';
import type { RecencyMarkProps } from './types';

// The marker saying a compendium entry is New or Updated: not a badge, so it reads apart from the stock,
// source and safety badges. It carries the words and a small icon hidden from assistive technology
// (claude-docs/components/entry-marks.md, "New and Updated (MB.106)").

const Svg = ({ children }: { children: ReactNode }): ReactElement => (
  <svg
    className="recency-mark__icon"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    {children}
  </svg>
);

// A big four-point sparkle and a small one: a thing just made.
const Sparkle = (): ReactElement => (
  <Svg>
    <path d="M10 3l1.8 5.2L17 10l-5.2 1.8L10 17l-1.8-5.2L3 10l5.2-1.8z" />
    <path d="M19 14l.9 2.1L22 17l-2.1.9L19 20l-.9-2.1L16 17l2.1-.9z" />
  </Svg>
);

// A wand with a spark at its tip: a thing touched up.
const Wand = (): ReactElement => (
  <Svg>
    <path d="M4 20L14 10" />
    <path d="M14 3v4M12 5h4" />
    <path d="M19 9v3M17.5 10.5h3" />
    <path d="M7 4v2M6 5h2" />
  </Svg>
);

const RecencyMark = ({ recency }: RecencyMarkProps): ReactElement | null => {
  if (!recency) return null;
  const isNew = recency === 'new';
  return (
    <span className={`recency-mark recency-mark--${recency}`}>
      {isNew ? <Sparkle /> : <Wand />}
      <span className="recency-mark__text">{isNew ? 'New' : 'Updated'}</span>
    </span>
  );
};

export default RecencyMark;
