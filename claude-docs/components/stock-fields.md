# StockFields

`src/components/StockFields/` — a jar's three amounts, Quantity, Unit and Low Stock At (the low-stock threshold), drawn inside whichever react-hook-form form holds a jar. The chosen jar of the [`StockDialog`](stock-dialog.md) is its only user, at full size.

## What it is

A fragment of three fields: they sit in the form's own gap like any fields, so the form places its alert above them and its actions below. They read the form through `useFormContext`, so the caller wraps them in `FormProvider` and types the form with `StockFormValues` (or a superset of it).

## Props

`StockFieldsProps` (`types.ts`) is all optional: `prefix` (a row of a list, `rows.0`), `form` (passed to each field as `labelSuffix`, so two rows' fields are never named alike: "Quantity, Flower"; [`field.md`](field.md)) and `disabled` (the StockDialog's stand-in fields before a form is chosen). The generic parameter `V` is the caller's form values: the prefix is a row of a list the type cannot follow, so `V` vouches for it.

| Field        | Control                 | Value in the form                              |
| ------------ | ----------------------- | ---------------------------------------------- |
| Quantity     | `TextField type=number` | the text typed; `''` is held but not measured  |
| Unit         | `SelectField`           | a unit code, or `''` for None                  |
| Low Stock At | `TextField type=number` | the text typed; `''` is none, `0` turns it off |

The two number boxes take any decimal (`step="any"`, set by `TextField` for `type="number"`), and keep the text typed: a `0` is a quantity, an empty box is none.

## Changing the unit converts nothing

Choosing another unit leaves Quantity and Threshold exactly as typed; the unit only says what they are measured in. This follows the unit rule (weight to weight and volume to volume, never a guess): the form cannot convert across dimensions, and it does not convert within one either. A person who means 250 g as 0.25 kg types it.

## Helpers

All in `values.ts`, re-exported from the component:

- `stockFormValues({ quantity, unit, threshold })` starts a form from a jar: each amount as text, `null` as `''`, zero kept.
- `EMPTY_STOCK` starts a new row or the add dialog's form.
- `stockAmountsOf(values)` turns the form's text into the `StockInput` amounts: `''` and text that is no number become `null`, a unit not in the vocabulary becomes `null`. It checks nothing else: the service parses again and refuses a negative or too-large amount.

`units.ts` holds `UNIT_OPTIONS`: None first, then every unit in the vocabulary's own order. The two fluid ounces read "fl oz (UK)" and "fl oz (US)"; every other unit reads as its code.

## Stories and tests

`src/components/StockFields/index.stories.tsx` (an Out Of Stock state shows a quantity of zero is an amount, not an empty box); `tests/components/StockFields/index.test.tsx`.
