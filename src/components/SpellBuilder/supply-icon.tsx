import type { ReactElement } from 'react';

// The two verdicts StockBadge has no symbol for, drawn as its `StockIcon` is (16 box, 1.5 round
// stroke, currentColor, hidden from screen readers) so the four match. Strokes stay half a stroke
// (0.75) inside the box. The word beside each stays visible.

const Icon = ({ className, children }: { className: string; children: ReactElement }) => (
  <svg
    className={className}
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    {children}
  </svg>
);

export const NotEnoughIcon = ({ className }: { className: string }): ReactElement => (
  <Icon className={className}>
    <path d="M5.5 2.5h5M5.5 2.5v1.5L4 5.5v6.5a1.5 1.5 0 0 0 1.5 1.5h5a1.5 1.5 0 0 0 1.5-1.5V5.5L10.5 4V2.5M4 9h8" />
  </Icon>
);

export const UnitsDifferIcon = ({ className }: { className: string }): ReactElement => (
  <Icon className={className}>
    <path d="M3.5 6h9M3.5 10h9M10.5 3 5.5 13" />
  </Icon>
);
