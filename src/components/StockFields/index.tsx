import type { ReactElement } from 'react';
import type { FieldPath, FieldValues } from 'react-hook-form';
import { SelectField, TextField } from '../Field';
import type { StockFieldsProps, StockFormValues } from './types';
import { UNIT_OPTIONS } from './units';

// A jar's three amounts for any react-hook-form form that holds a jar: under a row's `prefix`
// ("rows.0") in the StockDialog, or at the form's top level in the add dialog. Changing the
// unit never converts the quantity or the threshold: the numbers stay as typed.
// claude-docs/components/stock-fields.md.
export default function StockFields<V extends FieldValues = StockFormValues>({
  prefix,
  form,
  disabled,
}: StockFieldsProps = {}): ReactElement {
  // The path of one of the three under the prefix, typed as the form's own:
  // the prefix is a row of a list the caller's values hold, which the type
  // cannot follow, so the caller's `V` vouches for it.
  const at = (key: keyof StockFormValues) => (prefix ? `${prefix}.${key}` : key) as FieldPath<V>;
  return (
    <>
      <TextField<V>
        name={at('quantityOnHand')}
        label="Quantity"
        labelSuffix={form}
        disabled={disabled}
        type="number"
        placeholder="Add an amount"
        autoComplete="off"
      />
      <SelectField<V>
        name={at('unit')}
        label="Unit"
        labelSuffix={form}
        disabled={disabled}
        hint="Changing the unit keeps the numbers as typed. It does not convert them."
        placeholder="Choose a unit"
        options={UNIT_OPTIONS}
      />
      <TextField<V>
        name={at('lowStockThreshold')}
        label="Low Stock At"
        labelSuffix={form}
        disabled={disabled}
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
export type { StockAmounts, StockFieldsProps, StockFormValues, StockOfJar } from './types';
