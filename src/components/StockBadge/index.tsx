'use client';

import { type ReactElement, useId } from 'react';
import IconTip from '../IconTip';
import { formLabel } from '@/modules/ingredients/validation/form-label';
import { stockState, worstStock } from './stock-state';
import type { CardStockBadgeProps, StockBadgeProps } from './types';
import './index.scss';

// A jar's Low Stock or Out of Stock badge (M9.8, story 23), in two shapes over one
// drawing: `StockBadge` for one jar, on each form line of the Quick Look window, and
// `CardStockBadge` for a coven card, one badge for the worst of its jars (M9.9).
// Nothing to flag, nothing rendered: a consumer renders it every time and checks nothing.
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

/**
 * The drawn badge both exports share: a button whose only job is its tip, named
 * for its state, and described by `description` where it says more than the name.
 */
const Badge = ({
  out,
  tip,
  description,
}: {
  out: boolean;
  tip: string;
  description?: string;
}): ReactElement => {
  const descriptionId = useId();
  return (
    <IconTip tip={tip}>
      <button
        type="button"
        className={`badge stock-badge ${out ? 'badge--out-of-stock stock-badge--out' : 'badge--low-stock stock-badge--low'}`}
        aria-label={out ? 'Out of Stock' : 'Low Stock'}
        aria-describedby={description ? descriptionId : undefined}
      >
        <Drawing out={out} />
      </button>
      {description && (
        <span id={descriptionId} className="visually-hidden">
          {description}
        </span>
      )}
    </IconTip>
  );
};

export const StockBadge = ({ quantity, threshold, unit }: StockBadgeProps): ReactElement | null => {
  const state = stockState(quantity, threshold);
  if (state === 'ok') return null;
  if (state === 'out') return <Badge out tip="Out of Stock" />;
  // `low` means a quantity and a threshold above 0 both exist.
  const tip = `Low Stock at ${withUnit(threshold as number, unit)} or less`;
  return <Badge out={false} tip={tip} description={tip} />;
};

/**
 * A coven card's one badge (M9.9): the worst state across its jars, the tip and
 * the description naming the forms in it, "Low Stock: Flower". Nothing to flag,
 * nothing rendered, as for one jar.
 */
export const CardStockBadge = ({ jars }: CardStockBadgeProps): ReactElement | null => {
  const worst = worstStock(jars);
  if (!worst) return null;
  const out = worst.state === 'out';
  const words = `${out ? 'Out of Stock' : 'Low Stock'}: ${worst.forms.map(formLabel).join(', ')}`;
  return <Badge out={out} tip={words} description={words} />;
};

export { stockState, worstStock };
