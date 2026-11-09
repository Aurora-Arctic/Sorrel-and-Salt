# StockFields

`src/components/StockFields/` — a jar's three amounts, Quantity, Unit and Low Stock At (the low-stock threshold), drawn inside whichever react-hook-form form holds a jar. The chosen jar of the [`StockDialog`](stock-dialog.md) is its only user, at full size.

A fragment of three fields: they sit in the form's own gap like any fields, so the form places its alert above them and its actions below. They read the form through `useFormContext`, so the caller wraps them in `FormProvider` and types the form with `StockFormValues` (or a superset of it).

## Props

All optional: `prefix` (a row of a list, `rows.0`), `form` (passed to each field as `labelSuffix`, so two rows' fields are never named alike: "Quantity, Flower"; [`field.md`](field.md)) and `disabled` (the StockDialog's stand-in fields before a form is chosen). The generic parameter `V` is the caller's form values: the prefix is a row of a list the type cannot follow, so `V` vouches for it.

The two amount boxes are text inputs with `inputMode="decimal"`, not `type="number"`. A comma or a point is accepted, and the value tidies on blur (`2,5` becomes `2.5`) through `formatQuantity` (`src/lib/formats.ts`). The rule (a non-negative number, at most three decimals, at most `MAX_QUANTITY`) is `quantity()` in `src/lib/validation.ts`, shared with the server. A `0` is a quantity, an empty box is none (`''` for Low Stock At is none, `0` turns it off).

## Changing the unit converts nothing

Choosing another unit leaves Quantity and Threshold exactly as typed; the unit only says what they are measured in. This follows the unit rule (weight to weight and volume to volume, never a guess): the form cannot convert across dimensions, and it does not convert within one either. A person who means 250 g as 0.25 kg types it.

## Helpers

All in `values.ts`, re-exported from the component. `stockAmountsOf(values)` turns the form's text into the `StockInput` amounts: `''` becomes `null`, and text that is no number also becomes `null` (a form with a resolver refuses it first), a unit not in the vocabulary becomes `null`. It checks nothing else: the service parses again and refuses a negative or too-large amount. `units.ts` holds `UNIT_OPTIONS`: None first, then every unit in the vocabulary's own order; the two fluid ounces read "fl oz (UK)" and "fl oz (US)".
