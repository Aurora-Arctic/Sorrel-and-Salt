import type { StockState } from './types';

// The one place the badge table is written; the server's `holdsJarLowOrOut` says the same in SQL,
// so change both (claude-docs/components/stock-badge.md, "The table").
export function stockState(
  quantity: number | null | undefined,
  threshold: number | null | undefined,
): StockState {
  if (quantity === null || quantity === undefined) return 'ok';
  if (quantity === 0) return 'out';
  // A threshold of 0 or none switches the Low Stock warning off; it never means always low.
  if (threshold === null || threshold === undefined || threshold <= 0) return 'ok';
  return quantity > 0 && quantity <= threshold ? 'low' : 'ok';
}
