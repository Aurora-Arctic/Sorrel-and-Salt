import type { ReactElement } from 'react';
import { SelectField, TextField } from '../Field';
import type { StockFormValues } from './types';
import { UNIT_OPTIONS } from './units';

// A jar's three amounts, for whichever react-hook-form form holds a jar: the
// edit dialog on a jar line (M9.9) and the add dialog (M9.12). They sit in the
// form's gap like any fields, so the form draws them between its alert and its
// actions. Changing the unit never converts the quantity or the threshold: the
// numbers stay as typed, and the unit says what they are measured in.
// claude-docs/components/stock-fields.md.
export default function StockFields(): ReactElement {
  return (
    <>
      <TextField<StockFormValues>
        name="quantityOnHand"
        label="Quantity"
        type="number"
        placeholder="Add an amount"
        autoComplete="off"
      />
      <SelectField<StockFormValues>
        name="unit"
        label="Unit"
        hint="Changing the unit keeps the numbers as typed. It does not convert them."
        placeholder="Choose a unit"
        options={UNIT_OPTIONS}
      />
      <TextField<StockFormValues>
        name="lowStockThreshold"
        label="Low-Stock Threshold"
        type="number"
        hint="The jar is badged Low Stock at this amount or below. Zero turns the badge off."
        placeholder="Add a level"
        autoComplete="off"
      />
    </>
  );
}

export { EMPTY_STOCK, stockAmountsOf, stockFormValues } from './values';
export { UNIT_OPTIONS, unitLabel } from './units';
export type { StockAmounts, StockFormValues, StockOfJar } from './types';
