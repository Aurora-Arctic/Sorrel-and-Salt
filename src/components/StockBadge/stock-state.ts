import type { StockState } from './types';

// The one place the badge table is written; the server's `holdsJarLowOrOut` says the same in SQL,
// so change both (claude-docs/components/stock-badge.md, "The table").
export function stockState(
  quantity: number | null | undefined,
  threshold: number | null | undefined,
): StockState {
  // Held but not weighed: nothing to compare, so nothing to flag.
  if (quantity === null || quantity === undefined) return 'ok';
  // Empty is out whatever the threshold says, even a threshold of 0.
  if (quantity === 0) return 'out';
  // A threshold of 0 or none switches the Low Stock warning off; it never means always low.
  if (threshold === null || threshold === undefined || threshold <= 0) return 'ok';
  return quantity > 0 && quantity <= threshold ? 'low' : 'ok';
}
