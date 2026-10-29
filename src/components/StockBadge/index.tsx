'use client';

import { type ReactElement, useId } from 'react';
import IconTip from '../IconTip';
import { stockState } from './stock-state';
import { stockName, stockTip } from './stock-words';
import type { StockBadgeProps, StockTipProps, StockIconProps } from './types';
import './index.scss';

// A jar's Low Stock or Out of Stock badge, per jar, so a card holding two forms can flag one and
// not the other; it renders nothing when there is nothing to flag
// (claude-docs/components/stock-badge.md, "Component notes").

/** The drawing that tells Low (double chevron) from Out (slashed ring) without colour; shared with the entry page's shelf. */
export const StockIcon = ({
  out,
  className = 'stock-badge__icon',
}: StockIconProps): ReactElement => (
  <svg
    className={className}
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
);

/** A button that opens a Low or Out tip, shared by the badge and the entry page's shelf; each brings its own name, class and face. */
export const StockTip = ({
  state,
  threshold,
  unit,
  ariaLabel,
  className,
  children,
}: StockTipProps): ReactElement => {
  const descriptionId = useId();
  const tip = stockTip(state, threshold, unit);
  const low = state === 'low';
  return (
    <IconTip tip={tip}>
      <button
        type="button"
        className={className}
        aria-label={ariaLabel}
        aria-describedby={low ? descriptionId : undefined}
      >
        {children}
      </button>
      {low && (
        <span id={descriptionId} className="visually-hidden">
          {tip}
        </span>
      )}
    </IconTip>
  );
};

export const StockBadge = ({ quantity, threshold, unit }: StockBadgeProps): ReactElement | null => {
  const state = stockState(quantity, threshold);
  if (state === 'ok') return null;
  const out = state === 'out';
  return (
    <StockTip
      state={state}
      threshold={threshold}
      unit={unit}
      ariaLabel={stockName(state)}
      className={`stock-badge ${out ? 'stock-badge--out' : 'stock-badge--low'}`}
    >
      <StockIcon out={out} />
    </StockTip>
  );
};

export { stockState };
