# StockBadge and ThresholdReadout

`src/components/StockBadge/` — how the project flags a jar that is running low or
empty (M9.8, story 23). Two components share the directory:

- **`StockBadge`** shows Low Stock or Out of Stock for one jar, or nothing.
- **`ThresholdReadout`** states the jar's low-stock level on the jar line.

The ingredient card (M8.14) and the entry page (M8.19) leave a slot on each jar
line for these. A consumer renders them for every jar and checks nothing itself.
Editing the threshold is M9.9's, in its dialog.

## Props

`StockBadgeProps` (`types.ts`):

| Prop        | What it is                                                                 |
| ----------- | -------------------------------------------------------------------------- |
| `quantity`  | The jar's quantity on hand. `null` is held but not weighed                 |
| `threshold` | The jar's low-stock threshold. `null` or 0 turns the Low Stock warning off |

`ThresholdReadoutProps`: `threshold` (as above) and `unit`, the jar's unit as its
row spells it.

## The table

`stockState(quantity, threshold)` (`stock-state.ts`) is a pure function and the one
place this table is written in code:

| A jar whose quantity is …                                                 | Shows        |
| ------------------------------------------------------------------------- | ------------ |
| 0, whatever its threshold                                                 | Out of Stock |
| above 0, and at or below its threshold, when the threshold is above 0     | Low Stock    |
| above its threshold, or anything above 0 when the threshold is 0 or empty | No badge     |
| empty (held, unweighed)                                                   | No badge     |

The server's `lowStockOnly` filter says the same thing in SQL
(`holdsJarLowOrOut` in `src/db/repository/ingredients.ts`; see
[`../db/stock.md`](../db/stock.md)). A change to the table is a change to both.

## Contracts

- **Per jar, not per entry.** A card holding two forms can show Low Stock on one
  and nothing on the other.
- **Nothing to flag, nothing rendered.** `StockBadge` returns `null` for the "No
  badge" rows.
- **A threshold of 0 disables the warning.** It never means "always low". A jar at
  0 still reads Out of Stock. `ThresholdReadout` shows a threshold of 0 as
  "Low Stock warning off" and a null threshold as nothing.
- **The meaning never rests on colour.** Each state carries its words and its own
  small drawing (a down chevron for Low, a slashed ring for Out), hidden from
  assistive technology because the words are there.
- **Text, not a control.** Nothing here takes focus.

## Styling

Both states wear `.badge--low-stock`, the muted tinted palette. Safety stays the
only alarming badge ([`styling.md`](../styling.md), "Badge palettes"), and no
colour token is added before the section's design review. Out of Stock is told
apart without colour: a 2px border in place of 1px, a heavier weight, and the
slashed ring in place of the chevron. Its vertical padding is trimmed by the extra
border so the two badges stand the same height.

**Open for the design review:** whether Out of Stock should get a palette of its
own (the same inks, a different tint), once the section is designed.

## Stories

[`index.stories.tsx`](../../src/components/StockBadge/index.stories.tsx), under
`Surfaces / Stock Badge`: `Low`, `Out`, `Fine` (empty on purpose), `Readout`,
`ReadoutOff`, and `PhoneDark` and `PhoneLight` showing a jar line of each state at 375px.

## Testing

`tests/components/StockBadge/index.test.tsx` walks every row of the table through
`stockState`, checks which of the two badges shows (and that the other does not),
that a zero threshold still reads Out of Stock at 0, that the two states differ in
their drawing, and the readout's three cases. The `lowStockOnly` filter is proved
on the rows in `tests/modules/ingredients/services/workspace-ingredient-list.test.ts`
and its count in `tests/modules/ingredients/services/ingredient-facets.test.ts`.
