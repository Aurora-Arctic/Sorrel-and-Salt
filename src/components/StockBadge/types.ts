import type { ReactNode } from 'react';

export type StockState = 'out' | 'low' | 'ok';

export interface StockBadgeProps {
  quantity: number | null | undefined;
  /** The jar's low-stock threshold; `null` or 0 turns the Low Stock warning off, so no Low badge. */
  threshold: number | null | undefined;
  unit?: string | null;
}

export interface StockTipProps {
  state: Exclude<StockState, 'ok'>;
  threshold: number | null | undefined;
  unit: string | null | undefined;
  ariaLabel: string;
  className: string;
  children: ReactNode;
}

export interface StockIconProps {
  out: boolean;
  className?: string;
}
