import { z } from 'zod';
import { MAX_QUANTITY } from '../schema/quantities';
import { UNITS } from '../schema/units';

// What a workspace holds of one ingredient, as the stock mutations and the
// inline row editor write it. `unitDimension` is not input: the service
// derives it from `unit` with `dimensionOf`, so the two cannot disagree.

// Not a CHECK constraint: a negative amount is a refusal with something to
// say, so it is said here (claude-docs/db/stock.md, "Nullability, and why zero is not
// the same as nothing").
const amount = (label: string) =>
  z
    .number({ error: `${label} must be a number` })
    .nonnegative({ error: `${label} cannot be negative` })
    .max(MAX_QUANTITY, {
      error: `${label} is too large — the most it can be is ${MAX_QUANTITY.toLocaleString('en', { maximumFractionDigits: 3 })}`,
    })
    .nullish();

export const StockInput = z.object({
  // Null is "we have this, unweighed"; 0 is out of stock.
  quantityOnHand: amount('Quantity'),
  // The units module's list, never a second one here.
  unit: z.enum(UNITS, { error: 'Choose a unit from the list' }).nullish(),
  lowStockThreshold: amount('Low-stock threshold'),
  // Blank is an absence, as on every optional text field.
  source: z
    .string()
    .trim()
    .nullish()
    .transform((value) => (value === '' ? null : value)),
  // A calendar date, as the `date` column holds it — no time of day.
  acquiredDate: z.iso.date({ error: 'Enter a date as YYYY-MM-DD' }).nullish(),
});

export type StockInput = z.output<typeof StockInput>;
