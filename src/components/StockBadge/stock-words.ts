import { formatQuantity } from '@/lib/quantity';
import type { StockState } from './types';

// The words a jar's Low Stock or Out of Stock state is told in, plain strings so a server component
// can call them too (claude-docs/components/stock-badge.md, "Shared words").

export const stockName = (state: 'low' | 'out'): string =>
  state === 'out' ? 'Out of Stock' : 'Low Stock';

export const stockTip = (
  state: Exclude<StockState, 'ok'>,
  threshold: number | null | undefined,
  unit: string | null | undefined,
): string =>
  state === 'out'
    ? 'Out of Stock'
    : `Low Stock at ${formatQuantity(threshold as number, unit)} or less`;

export const amountText = (quantity: number | null, unit: string | null | undefined): string =>
  quantity === null ? 'Unmeasured' : formatQuantity(quantity, unit);
