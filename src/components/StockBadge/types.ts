import type { ReactNode } from 'react';

/** What a jar's quantity and threshold say about it. */
export type StockState = 'out' | 'low' | 'ok';

export interface StockBadgeProps {
  /** The jar's quantity on hand; `null` is held but not weighed, which gets no badge. */
  quantity: number | null | undefined;
  /** The jar's low-stock threshold; `null` or 0 turns the Low Stock warning off, so no Low badge. */
  threshold: number | null | undefined;
  /** The jar's unit as its row spells it, written after the quantity and the threshold. */
  unit?: string | null;
}

export interface StockTipProps {
  /** The state the button tells; only Low and Out have a tip. */
  state: Exclude<StockState, 'ok'>;
  /** The jar's low-stock threshold, written into Low's tip. */
  threshold: number | null | undefined;
  /** The jar's unit, written after the threshold. */
  unit: string | null | undefined;
  /** The button's accessible name: the state's name on the badge, the amount and it on the shelf. */
  ariaLabel: string;
  /** The button's class: the badge's box, or the shelf's bare text. */
  className: string;
  /** What the button shows: the badge's drawing, or the shelf's amount. */
  children: ReactNode;
}

export interface StockIconProps {
  /** True draws Out of Stock's slashed ring; false draws Low's double chevron. */
  out: boolean;
  /** The class that sizes it; the badge's own by default. */
  className?: string;
}
