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
- **Each badge is its drawing alone** (the owner's call, 2026-10-20), a 24px square
  holding the icon, with no words on it. It is a button whose only job is to open a
  tip, for both states. The tip is InfoTip's, through `useTip`
  (`src/components/InfoTip/use-tip.ts`, which also places the bubble on screen) and
  the InfoTip markup: it opens on hover, tap and focus, closes on Escape, and stays
  open while the pointer is over it (WCAG 1.4.13).
- **Low's tip has two lines:** "Low Stock · 6 g", the quantity and unit as a plain
  number, then the level, "Low at 10 g or less". **Out of Stock's tip is "Out of
  Stock".**
- **The words are in the name, not on the badge.** The button's `aria-label` is "Low
  Stock, 6 g" or "Out of Stock", so a screen reader has the full words without
  opening the tip. Low's level line is its `aria-describedby`, so it is the
  description and not part of the name; Out of Stock has no description, since its
  tip would only repeat the name.
- **A threshold of 0 or none shows no Low badge.** It never means "always low". A
  jar at 0 still reads Out of Stock.
- **The meaning never rests on colour.** Each state has its own drawing (a double
  down chevron for Low, a slashed ring for Out) as well as its tint, and the name
  and the tip carry the words. The drawing is hidden from assistive technology
  because the button's name is there.

## Styling

Low Stock wears `.badge--low-stock`, the muted tinted palette. Out of Stock wears
`.badge--out-of-stock`, a muted red of its own, a tint of the sealing wax with its
saturation pulled down; the owner chose it on 2026-10-18. Safety stays the only
solid, alarming badge ([`styling.md`](../styling.md), "Badge palettes"). Meaning
never rests on colour: the two drawings differ, the slashed ring in place of the
double chevron. Both badges are the same 24px square (the cards' `.badge` size
rules would pad it, so `.ingredient-card .specimen__stock .stock-badge` zeroes the
padding). Until 2026-10-20 they carried the words ("Low · 6 g", "Out of Stock"), and
Out of Stock a 2px border and a heavier weight to tell it from Low; with the words
gone the drawings do that.

## Stories

[`index.stories.tsx`](../../src/components/StockBadge/index.stories.tsx), under
`Surfaces / Stock Badge`: `Low`, `Out`, and `PhoneDark` and `PhoneLight` showing a jar line of each state at 375px.

## Testing

`tests/components/StockBadge/index.test.tsx` walks the shared jar states through
`stockState`, checks which of the two badges shows (and that the other does not), that
a zero threshold still reads Out of Stock at 0, that the two states differ in their
drawing, that neither badge carries words, each badge's name and description, and each
tip's words, opening on focus, hover and click, closing on Escape and holding while the
pointer rests on it. The `lowStockOnly` filter is proved
on the same jar states, one entry each, in `tests/modules/ingredients/services/workspace-ingredient-list.test.ts`
and its count in `tests/modules/ingredients/services/ingredient-facets.test.ts`.
