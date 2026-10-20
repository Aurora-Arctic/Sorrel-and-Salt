import type { StockOfForm, StockState, WorstStock } from './types';

// The one place the badge table is written (M9.8). The server's `lowStockOnly`
// filter says the same thing in SQL (`holdsJarLowOrOut` in the ingredients
// repository), so a change here is a change there. Pure, so a test can walk
// every row of the table without rendering. tests/support/jar-states.ts holds the
// shared list of jar states that both copies are tested against.
// claude-docs/components/stock-badge.md, "The table".
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

/**
 * The one state a coven card shows for all its jars (M9.9): Out of Stock beats
 * Low Stock, and `forms` lists only the forms in that worst state, in the order
 * given, so the tip reads "Out of Stock: Oil, Tea" and leaves a low Flower to
 * the Quick Look window's own lines. `null` when no jar is low or out, an
 * unmeasured one included. The owner may yet want every affected form named;
 * claude-docs/components/stock-badge.md, "One badge per card".
 */
export function worstStock(jars: readonly StockOfForm[]): WorstStock | null {
  for (const state of ['out', 'low'] as const) {
    const forms = jars
      .filter((jar) => stockState(jar.quantity, jar.threshold) === state)
      .map((jar) => jar.form);
    if (forms.length > 0) return { state, forms };
  }
  return null;
}
