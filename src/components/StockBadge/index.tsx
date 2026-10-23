'use client';

import { type ReactElement, useId } from 'react';
import IconTip from '../IconTip';
import { stockState } from './stock-state';
import { stockName, stockTip } from './stock-words';
import type { StockBadgeProps, StockTipProps, StockIconProps } from './types';
import './index.scss';

// A jar's Low Stock or Out of Stock badge (M9.8, story 23): per jar, in the
// jar-line slot the ingredient card leaves, so a card holding two forms can
// flag one and not the other. Nothing to flag, nothing rendered: a consumer
// renders it every time and checks nothing.
//
// Each state is its drawing alone in a small square (the owner's call,
// 2026-10-20), so neither can rest on colour: Low is a double chevron and Out of
// Stock a slashed ring. Neither is boxed any more (the owner's call, 2026-10-21):
// the drawing is drawn in the colour of the matching jar on the entry's shelf, the
// warning amber for Low and Out of Stock's red; safety stays the only boxed,
// alarming badge (styling.md). The words moved to a button
// name and a tip. Both states are buttons whose only job is to open that tip, and
// they are icon tips (the owner's call, 2026-10-20): `IconTip`'s, which opens after
// a rest of the pointer or at once on focus, fades, closes the moment the pointer
// leaves or on Escape, and cannot be hovered. Low's tip is one statement of the
// level, "Low Stock at 10 g or less", without the jar's amount, which the jar line
// already shows; Out of Stock's is its name. The name is an `aria-label` ("Low
// Stock" / "Out of Stock") so a screen reader has the words without opening the tip.
// `IconTip`'s bubble is decoration, hidden from a screen reader and mounted only
// while open, so Low's statement is also written once, out of sight, as the button's
// description: a reader hears it with or without the tip.
// The words themselves (the name, the tip) are `stock-words.ts`, shared with the entry
// page's jar shelf, which tells Low and Out by the jar and a button on its amount.
// That button is `StockTip`, exported here so the badge and the shelf draw one
// button with one name and one description (MB.121's repetition check).
// claude-docs/components/stock-badge.md.

/**
 * The drawing that tells Low from Out without colour: a double chevron for Low, a slashed ring
 * for Out. Exported so the entry page's shelf puts the same symbol beside a Low or Out amount
 * and the two places can never draw the states differently (MB.121, proposal P1).
 */
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

/**
 * A button whose one job is to open a Low or Out tip, with the tip's statement written once
 * out of sight as its description for Low (Out's would only repeat the name). The badge and
 * the entry page's shelf both draw it, so the two say the same thing the same way; each
 * brings its own name, class and face (MB.121's repetition check).
 */
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
