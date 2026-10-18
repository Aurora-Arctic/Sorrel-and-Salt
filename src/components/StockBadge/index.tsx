import type { ReactElement } from 'react';
import { stockState } from './stock-state';
import type { StockBadgeProps, ThresholdReadoutProps } from './types';
import './index.scss';

// A jar's Low Stock or Out of Stock badge (M9.8, story 23): per jar, in the
// jar-line slot the ingredient card leaves, so a card holding two forms can
// flag one and not the other. Nothing to flag, nothing rendered: a consumer
// renders it every time and checks nothing. Each state carries its words and
// its own small drawing, so neither rests on colour. Out of Stock has a muted
// red tint of its own; safety stays the only alarming badge (styling.md).
// claude-docs/components/stock-badge.md.

export const StockBadge = ({ quantity, threshold }: StockBadgeProps): ReactElement | null => {
  const state = stockState(quantity, threshold);
  if (state === 'ok') return null;
  const out = state === 'out';
  return (
    <span
      className={`badge ${out ? 'badge--out-of-stock stock-badge--out' : 'badge--low-stock'} stock-badge`}
    >
      <svg
        className="stock-badge__icon"
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        focusable="false"
      >
        {out ? (
          <>
            <circle cx="8" cy="8" r="5.5" />
            <path d="M4.1 11.9 11.9 4.1" />
          </>
        ) : (
          <path d="M3.5 3.5 8 8l4.5-4.5M3.5 8.5 8 13l4.5-4.5" />
        )}
      </svg>
      {out ? 'Out of Stock' : 'Low Stock'}
    </span>
  );
};

// The threshold on the jar line, as the member set it: editing it is M9.9's.
// A threshold of 0 reads as the warning being off, not as a level; none set
// draws nothing.
export const ThresholdReadout = ({
  threshold,
  unit,
}: ThresholdReadoutProps): ReactElement | null => {
  if (threshold === null || threshold === undefined) return null;
  return (
    <span className="stock-threshold">
      {threshold > 0 ? `Low at ${threshold} ${unit}` : 'Low Stock warning off'}
    </span>
  );
};

export { stockState };
