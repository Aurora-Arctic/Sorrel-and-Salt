import { parseQuantity, showQuantity } from '@/lib/formats';
import { type Unit, isUnit } from '@/modules/ingredients/schema/units';
import type { StockAmounts, StockFormValues, StockOfJar } from './types';

export const EMPTY_STOCK: StockFormValues = { quantityOnHand: '', unit: '', lowStockThreshold: '' };

/** The form's start for a jar held already: each amount as the text it would be typed as. */
export function stockFormValues({ quantity, unit, threshold }: StockOfJar): StockFormValues {
  return {
    quantityOnHand: quantity === null ? '' : showQuantity(quantity),
    unit: unit ?? '',
    lowStockThreshold: threshold === null ? '' : showQuantity(threshold),
  };
}

const amountOf = (text: string): number | null => {
  const amount = parseQuantity(text);
  return amount === null || !Number.isFinite(amount) ? null : amount;
};

/**
 * What the form holds, as `StockInput` takes it. Nothing is converted: a new
 * unit sits beside the numbers as typed (CLAUDE.md, unit conversion is never
 * a side effect of editing). The service checks the amounts again.
 */
export function stockAmountsOf(values: StockFormValues): StockAmounts {
  return {
    quantityOnHand: amountOf(values.quantityOnHand),
    unit: isUnit(values.unit) ? (values.unit as Unit) : null,
    lowStockThreshold: amountOf(values.lowStockThreshold),
  };
}
