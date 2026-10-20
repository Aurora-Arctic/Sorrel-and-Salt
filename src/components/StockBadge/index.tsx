'use client';

import { type ReactElement, useId } from 'react';
import { useTip } from '../InfoTip/use-tip';
import { stockState } from './stock-state';
import type { StockBadgeProps } from './types';
import './index.scss';

// A jar's Low Stock or Out of Stock badge (M9.8, story 23): per jar, in the
// jar-line slot the ingredient card leaves, so a card holding two forms can
// flag one and not the other. Nothing to flag, nothing rendered: a consumer
// renders it every time and checks nothing.
//
// Each state is its drawing alone in a small square (the owner's call,
// 2026-10-20), so neither can rest on colour: Low is a double chevron on the
// muted low-stock tint and Out of Stock a slashed ring on a red tint of its own;
// safety stays the only alarming badge (styling.md). The words moved to a button
// name and a tip. Both states are buttons whose only job is to open that tip,
// InfoTip's, through `useTip` (hover, tap and focus open it, Escape closes it,
// the pointer may rest on it: WCAG 1.4.13). Low's tip reads "Low Stock · 6 g" and
// then the level, "Low at 10 g or less"; Out of Stock's is its name. The name is
// an `aria-label` ("Low Stock, 6 g" / "Out of Stock") so a screen reader has the
// full words without opening the tip, and Low's level line is its description.
// claude-docs/components/stock-badge.md.

const Drawing = ({ out }: { out: boolean }): ReactElement => (
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
);

/** A quantity and its unit as the jar line writes them: "6 g", or "6" when the row has no unit. */
const withUnit = (amount: number, unit: string | null | undefined): string =>
  unit ? `${amount} ${unit}` : `${amount}`;

export const StockBadge = ({ quantity, threshold, unit }: StockBadgeProps): ReactElement | null => {
  const levelId = useId();
  const { open, show, showSoon, hide, hideSoon, anchor, bubble, bubbleStyle } = useTip();
  const state = stockState(quantity, threshold);
  if (state === 'ok') return null;

  const out = state === 'out';
  // `low` means a quantity and a threshold above 0 both exist.
  const heading = out ? 'Out of Stock' : `Low Stock · ${withUnit(quantity as number, unit)}`;
  const name = out ? 'Out of Stock' : `Low Stock, ${withUnit(quantity as number, unit)}`;

  return (
    // Hover on the wrapper, which holds the tip as well as the button, so the
    // pointer can move onto the tip without closing it.
    <span ref={anchor} className="stock-badge-tip" onMouseEnter={showSoon} onMouseLeave={hideSoon}>
      {/* A tap opens rather than toggles, as InfoTip's does: on touch the
          emulated hover has already opened it. */}
      <button
        type="button"
        className={`badge stock-badge ${out ? 'badge--out-of-stock stock-badge--out' : 'badge--low-stock stock-badge--low'}`}
        aria-label={name}
        aria-describedby={out ? undefined : levelId}
        onFocus={show}
        onBlur={hide}
        onClick={show}
      >
        <Drawing out={out} />
      </button>
      <span
        ref={bubble}
        role="tooltip"
        className={open ? 'stock-badge__tip is-open' : 'stock-badge__tip'}
        aria-hidden={!open}
        style={bubbleStyle}
      >
        {heading}
        {!out && (
          <span id={levelId} className="stock-badge__level">
            {`Low at ${withUnit(threshold as number, unit)} or less`}
          </span>
        )}
      </span>
    </span>
  );
};

export { stockState };
