import { z } from 'zod';
import { CalendarDay, optionalText, quantity } from '../../../lib/validation';
import { UNITS } from '../schema/units';

// What a workspace holds of one ingredient, as the stock mutations and the
// inline row editor write it. `unitDimension` is not input: the service
// derives it from `unit` with `dimensionOf`, so the two cannot disagree.

export const StockInput = z.object({
  // Null is "we have this, unweighed"; 0 is out of stock.
  quantityOnHand: quantity('Quantity').nullish(),
  // The units module's list, never a second one here.
  unit: z.enum(UNITS, { error: 'Choose a unit from the list' }).nullish(),
  lowStockThreshold: quantity('Low Stock At').nullish(),
  source: optionalText(),
  acquiredDate: CalendarDay.nullish(),
});

export type StockInput = z.output<typeof StockInput>;
