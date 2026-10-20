import type { Unit } from '@/modules/ingredients/schema/units';

/**
 * What a form holding the stock fields keeps under their names: all text, as
 * a number input hands it over, with `''` for nothing. The form that draws
 * `StockFields` is a `useForm<StockFormValues>` (or a superset of it).
 */
export interface StockFormValues {
  quantityOnHand: string;
  /** A unit of the vocabulary, or `''` for none. */
  unit: string;
  lowStockThreshold: string;
}

/** The three amounts of a jar as `StockInput` takes them: a number or unit, `null` for nothing. */
export interface StockAmounts {
  quantityOnHand: number | null;
  unit: Unit | null;
  lowStockThreshold: number | null;
}

/** A jar's stock as the page reads it, to start a form from. */
export interface StockOfJar {
  quantity: number | null;
  unit: string | null;
  threshold: number | null;
}
