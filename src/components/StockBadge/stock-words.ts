import type { StockState } from './types';

// The words a jar's Low Stock or Out of Stock state is told in, plain strings so a server component
// can call them too (claude-docs/components/stock-badge.md, "Shared words").

/** A quantity and its unit as the jar line writes them: "6 g", or "6" when the row has no unit. */
export const withUnit = (amount: number, unit: string | null | undefined): string =>
  unit ? `${amount} ${unit}` : `${amount}`;

/** The state's name: "Low Stock" or "Out of Stock". A screen reader hears it with the button. */
export const stockName = (state: 'low' | 'out'): string =>
  state === 'out' ? 'Out of Stock' : 'Low Stock';

/** The tip's one statement: "Low Stock at 10 g or less" (no amount, the page shows it), or "Out of Stock". */
export const stockTip = (
  state: Exclude<StockState, 'ok'>,
  threshold: number | null | undefined,
  unit: string | null | undefined,
): string =>
  state === 'out' ? 'Out of Stock' : `Low Stock at ${withUnit(threshold as number, unit)} or less`;

/** A jar's amount as every stock surface writes it: "250 g", "250" with no unit, or "Unmeasured". */
export const amountText = (quantity: number | null, unit: string | null | undefined): string =>
  quantity === null ? 'Unmeasured' : withUnit(quantity, unit);
