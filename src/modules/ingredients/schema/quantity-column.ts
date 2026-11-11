import { numeric } from 'drizzle-orm/pg-core';
import { QUANTITY_PRECISION, QUANTITY_SCALE } from './quantities';

// Kept out of quantities.ts, which imports nothing so the form can reach it.

/** A stock amount's column, at the precision and scale `quantities.ts` sets. */
export function quantityColumn(name: string) {
  return numeric(name, { precision: QUANTITY_PRECISION, scale: QUANTITY_SCALE });
}
