'use client';

import { type ReactElement, useId } from 'react';
import IconTip from '../IconTip';
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
  const descriptionId = useId();
  const state = stockState(quantity, threshold);
  if (state === 'ok') return null;

  const out = state === 'out';
  // `low` means a quantity and a threshold above 0 both exist.
  const tip = out ? 'Out of Stock' : `Low Stock at ${withUnit(threshold as number, unit)} or less`;
  const name = out ? 'Out of Stock' : 'Low Stock';

  return (
    <IconTip tip={tip}>
      <button
        type="button"
        className={`badge stock-badge ${out ? 'badge--out-of-stock stock-badge--out' : 'badge--low-stock stock-badge--low'}`}
        aria-label={name}
        aria-describedby={out ? undefined : descriptionId}
      >
        <Drawing out={out} />
      </button>
      {out ? null : (
        <span id={descriptionId} className="visually-hidden">
          {tip}
        </span>
      )}
    </IconTip>
  );
};

export { stockState };
