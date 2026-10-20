import type { ReactElement } from 'react';
import type { FieldPath, FieldValues } from 'react-hook-form';
import { SelectField, TextField } from '../Field';
import type { StockFieldsProps, StockFormValues } from './types';
import { UNIT_OPTIONS } from './units';
import './index.scss';

// A jar's three amounts, for whichever react-hook-form form holds a jar: a row
// of the StockDialog (M9.9), one per jar under `prefix` ("jars.0"), and the add
// dialog (M9.12) at the form's top level. They sit in the form's gap like any
// fields, so the form draws them between its alert and its actions. Changing
// the unit never converts the quantity or the threshold: the numbers stay as
// typed, and the unit says what they are measured in.
// claude-docs/components/stock-fields.md.
export default function StockFields<V extends FieldValues = StockFormValues>({
  prefix,
  form,
  size,
}: StockFieldsProps = {}): ReactElement {
  // The path of one of the three under the prefix, typed as the form's own:
  // the prefix is a row of a list the caller's values hold, which the type
  // cannot follow, so the caller's `V` vouches for it.
  const at = (key: keyof StockFormValues) => (prefix ? `${prefix}.${key}` : key) as FieldPath<V>;
  const fields = (
    <>
      <TextField<V>
        name={at('quantityOnHand')}
        label="Quantity"
        labelSuffix={form}
        size={size}
        type="number"
        placeholder="Add amount"
        autoComplete="off"
      />
      <SelectField<V>
        name={at('unit')}
        label="Unit"
        labelSuffix={form}
        size={size}
        hint="Changing the unit keeps the numbers as typed. It does not convert them."
        placeholder="Choose unit"
        options={UNIT_OPTIONS}
      />
      <TextField<V>
        name={at('lowStockThreshold')}
        label="Low Stock At"
        labelSuffix={form}
        size={size}
        type="number"
        hint="The jar is badged Low Stock at this amount or below. Zero turns the badge off."
        placeholder="Add level"
        autoComplete="off"
      />
    </>
  );
  // Compact, the three share one row, a wrapper the full fields do not need:
  // they sit straight in the form's column.
  return size === 'compact' ? <div className="stock-fields--compact">{fields}</div> : fields;
}

export { EMPTY_STOCK, stockAmountsOf, stockFormValues } from './values';
export { UNIT_OPTIONS, unitLabel } from './units';
export type { StockAmounts, StockFieldsProps, StockFormValues, StockOfJar } from './types';
