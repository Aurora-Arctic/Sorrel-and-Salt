import type { Unit } from '@/modules/ingredients/schema/units';

export interface StockFormValues {
  quantityOnHand: string;
  unit: string;
  lowStockThreshold: string;
}

export interface StockAmounts {
  quantityOnHand: number | null;
  unit: Unit | null;
  lowStockThreshold: number | null;
}

export interface StockOfJar {
  quantity: number | null;
  unit: string | null;
  threshold: number | null;
}

export interface StockFieldsProps {
  /** Where the three sit in the form's values, such as `jars.0`; left out, the top level. */
  prefix?: string;
  form?: string;
  disabled?: boolean;
}
