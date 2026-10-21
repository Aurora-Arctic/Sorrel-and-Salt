import { type Unit, isUnit } from '@/modules/ingredients/schema/units';
import type { StockAmounts, StockFormValues, StockOfJar } from './types';

/** A form with nothing in it: the add dialog's start. */
export const EMPTY_STOCK: StockFormValues = { quantityOnHand: '', unit: '', lowStockThreshold: '' };

/** The form's start for a jar held already: each amount as the text it would be typed as. */
export function stockFormValues({ quantity, unit, threshold }: StockOfJar): StockFormValues {
  return {
    quantityOnHand: quantity === null ? '' : String(quantity),
    unit: unit ?? '',
    lowStockThreshold: threshold === null ? '' : String(threshold),
  };
}

/** A number input's text as the number it holds; `null` for none, and for text that is no number. */
const amountOf = (text: string): number | null => {
  const trimmed = text.trim();
  if (trimmed === '') return null;
  const amount = Number(trimmed);
  return Number.isFinite(amount) ? amount : null;
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
