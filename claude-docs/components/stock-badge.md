# StockBadge

`src/components/StockBadge/` — how the project flags a jar that is running low or
empty (M9.8, story 23). `StockBadge` shows Low Stock or Out of Stock for one jar,
or nothing. The ingredient card (M8.14) and the entry page (M8.19) leave a slot on
each jar line for it. A consumer renders it for every jar and checks nothing itself.
Editing the threshold is M9.9's, in its dialog.

## Props

`StockBadgeProps` (`types.ts`):

| Prop        | What it is                                                              |
| ----------- | ----------------------------------------------------------------------- |
| `quantity`  | The jar's quantity on hand. `null` is held but not weighed              |
| `threshold` | The jar's low-stock threshold. `null` or 0 means no Low Stock badge     |
| `unit`      | The jar's unit as its row spells it, shown after the numbers (optional) |

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
[`../db/stock.md`](../db/stock.md)). A change to the table is a change to both, and
[`tests/support/jar-states.ts`](../../tests/support/jar-states.ts) holds one list of
jar states that both are tested against, so a change to one copy alone fails.

## Contracts

- **Per jar, not per entry.** A card holding two forms can show Low Stock on one
  and nothing on the other.
- **Nothing to flag, nothing rendered.** `StockBadge` returns `null` for the "No
  badge" rows.
- **Low reads "Low · 6 g".** The word, a middle dot, then the jar's quantity and
  unit as a plain number. Its accessible name is "Low Stock, 6 g": the word "Stock"
  is visually hidden, and the space before it sits outside the hidden span.
- **The threshold lives in the Low badge's tip.** "Low at 10 g or less". The badge
  is a button; the tip opens on hover, tap and focus, closes on Escape, and stays
  open while the pointer is over it (WCAG 1.4.13). It reuses `useTip`
  (`src/components/InfoTip/use-tip.ts`) and the InfoTip markup: the tip text stays
  in the page, `role="tooltip"`, listed in the button's `aria-describedby`, so it is
  the description and not part of the name.
- **A threshold of 0 or none shows no Low badge.** It never means "always low". A
  jar at 0 still reads Out of Stock.
- **Out of Stock is the word alone.** No quantity, no tip, not focusable.
- **The meaning never rests on colour.** Each state carries its words and its own
  small drawing (a double down chevron for Low, a slashed ring for Out), hidden from
  assistive technology because the words are there.

## Styling

Low Stock wears `.badge--low-stock`, the muted tinted palette. Out of Stock wears
`.badge--out-of-stock`, a muted red of its own, a tint of the sealing wax with its
saturation pulled down; the owner chose it on 2026-10-18. Safety stays the only
solid, alarming badge ([`styling.md`](../styling.md), "Badge palettes"). Meaning
never rests on colour: Out of Stock also has a 2px border in place of 1px, a heavier
weight, and the slashed ring in place of the double chevron. Its vertical padding is
trimmed by the extra border so the two badges stand the same height.

## Stories

[`index.stories.tsx`](../../src/components/StockBadge/index.stories.tsx), under
`Surfaces / Stock Badge`: `Low`, `Out`, and `PhoneDark` and `PhoneLight` showing a jar line of each state at 375px.

## Testing

`tests/components/StockBadge/index.test.tsx` walks the shared jar states through
`stockState`, checks which of the two badges shows (and that the other does not),
that a zero threshold still reads Out of Stock at 0, that the two states differ in
their drawing, and the Low badge's name, its description and the tip opening on focus,
hover and click and closing on Escape. The `lowStockOnly` filter is proved
on the same jar states, one entry each, in `tests/modules/ingredients/services/workspace-ingredient-list.test.ts`
and its count in `tests/modules/ingredients/services/ingredient-facets.test.ts`.
