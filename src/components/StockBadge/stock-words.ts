import type { StockState } from './types';

// The words a jar's Low Stock or Out of Stock state is told in, written once so the
// badge and the entry page's jar shelf say the same thing (M12.29). Plain strings and no
// component, so a server component can call them too (the badge file is a client one).
// claude-docs/components/stock-badge.md, "Shared words".

/** A quantity and its unit as the jar line writes them: "6 g", or "6" when the row has no unit. */
export const withUnit = (amount: number, unit: string | null | undefined): string =>
  unit ? `${amount} ${unit}` : `${amount}`;

/** The state's name: "Low Stock" or "Out of Stock". A screen reader hears it with the button. */
export const stockName = (state: 'low' | 'out'): string =>
  state === 'out' ? 'Out of Stock' : 'Low Stock';

/**
 * The tip's one statement: "Low Stock at 10 g or less" without the jar's amount, which the
 * page already shows, or "Out of Stock". A `low` state means a threshold above 0 exists.
 */
export const stockTip = (
  state: Exclude<StockState, 'ok'>,
  threshold: number | null | undefined,
  unit: string | null | undefined,
): string =>
  state === 'out' ? 'Out of Stock' : `Low Stock at ${withUnit(threshold as number, unit)} or less`;

/**
 * A jar's amount as every stock surface writes it (the card's jar line, the Edit Stock
 * dialog's list, the entry page's shelf): "250 g", "250" with no unit, or "Unmeasured" when
 * no quantity is recorded. One home, so the three never drift (MB.121's repetition check).
 */
export const amountText = (quantity: number | null, unit: string | null | undefined): string =>
  quantity === null ? 'Unmeasured' : withUnit(quantity, unit);
