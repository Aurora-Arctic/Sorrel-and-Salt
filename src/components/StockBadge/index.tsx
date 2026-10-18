'use client';

import { type ReactElement, useId } from 'react';
import { useTip } from '../InfoTip/use-tip';
import { stockState } from './stock-state';
import type { StockBadgeProps } from './types';
import './index.scss';

// A jar's Low Stock or Out of Stock badge (M9.8, story 23): per jar, in the
// jar-line slot the ingredient card leaves, so a card holding two forms can
// flag one and not the other. Nothing to flag, nothing rendered: a consumer
// renders it every time and checks nothing. Each state carries its words and
// its own small drawing, so neither rests on colour. Out of Stock has a muted
// red tint of its own and is the word alone; safety stays the only alarming
// badge (styling.md).
//
// Low reads "Low · 6 g", the jar's quantity beside the word, and is a button
// whose only job is to open a tip saying what counts as low ("Low at 10 g or
// less"). The tip is InfoTip's, through `useTip` (hover, tap and focus open it,
// Escape closes it, the pointer may rest on it: WCAG 1.4.13). Its text stays in
// the page while closed and the button lists it in `aria-describedby`, so a
// screen reader hears "Low Stock, 6 g" and then the level without opening it.
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
  const tipId = useId();
  const { open, show, hide, hideSoon, anchor, bubble, bubbleStyle } = useTip();
  const state = stockState(quantity, threshold);
  if (state === 'ok') return null;

  if (state === 'out') {
    return (
      <span className="badge badge--out-of-stock stock-badge stock-badge--out">
        <Drawing out />
        Out of Stock
      </span>
    );
  }

  // `low` means a quantity and a threshold above 0 both exist.
  return (
    // Hover on the wrapper, which holds the tip as well as the button, so the
    // pointer can move onto the tip without closing it.
    <span ref={anchor} className="stock-badge-tip" onMouseEnter={show} onMouseLeave={hideSoon}>
      {/* A tap opens rather than toggles, as InfoTip's does: on touch the
          emulated hover has already opened it. */}
      <button
        type="button"
        className="badge badge--low-stock stock-badge stock-badge--low"
        aria-describedby={tipId}
        onFocus={show}
        onBlur={hide}
        onClick={show}
      >
        <Drawing out={false} />
        <span>
          Low <span className="visually-hidden">Stock</span>
          {` · ${withUnit(quantity as number, unit)}`}
        </span>
      </button>
      <span
        ref={bubble}
        id={tipId}
        role="tooltip"
        className={open ? 'stock-badge__tip is-open' : 'stock-badge__tip'}
        aria-hidden={!open}
        style={bubbleStyle}
      >
        {`Low at ${withUnit(threshold as number, unit)} or less`}
      </span>
    </span>
  );
};

export { stockState };
