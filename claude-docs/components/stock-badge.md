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
  tip, for both states. The tip is an icon tip, `IconTip`'s
  ([`icon-tip.md`](icon-tip.md)), the owner's call (2026-10-20): the badge is an icon
  alone, so it behaves as every icon control's tip does. It opens once the pointer
  has rested on the badge 300ms or at once on focus, fades in, closes the moment the
  pointer leaves (after a 120ms fade) or on Escape, and **cannot be hovered**. Until
  2026-10-20 it was InfoTip's, which lets the pointer rest on the bubble (WCAG
  1.4.13's hoverable clause); that is not wanted here, since the bubble only repeats
  what the badge's name says and lingering it covers what is beside the badge, the
  same reason the icon tip gives. The words are on the button as its name and
  description, so the clause's purpose (a user who cannot read the bubble can still
  get the content) is met without it.
- **Low's tip is one statement,** "Low Stock at 10 g or less", the threshold and unit
  as a plain number, and **without the current amount**, which the jar line already
  shows (the owner's call, 2026-10-20; the tip first read "Low Stock · 6 g" over the
  level). With no unit it reads "Low Stock at 10 or less". **Out of Stock's tip is
  "Out of Stock".**
- **The words are in the name, not on the badge.** The button's `aria-label` is "Low
  Stock" or "Out of Stock", so a screen reader has the words without opening the tip.
  Low's statement is its `aria-describedby`, so it hears the level too, as the
  description and not part of the name; Out of Stock has no description, since its tip
  would only repeat the name. An icon tip's bubble is `aria-hidden` and mounted only
  while open, so it cannot be the description; `StockBadge` writes the statement
  once more beside the button as a `.visually-hidden` span, and `IconTip` takes no
  new prop for it.
- **A threshold of 0 or none shows no Low badge.** It never means "always low". A
  jar at 0 still reads Out of Stock.
- **The meaning never rests on colour.** Each state has its own drawing (a double
  down chevron for Low, a slashed ring for Out) as well as its tint, and the name
  and the tip carry the words. The drawing is hidden from assistive technology
  because the button's name is there.

## Shared words

The badge's words are written once, in `stock-words.ts` beside it: `stockName(state)` ("Low Stock" or "Out of Stock"), `stockTip(state, threshold, unit)` ("Low Stock at 10 g or less", or "Out of Stock") and `withUnit(amount, unit)` ("6 g", or "6" with no unit) and `amountText(quantity, unit)` (the jar's amount, `withUnit`'s words or **Unmeasured** when no quantity is recorded, used by the card's jar lines, the Edit Stock dialog's list and the shelf; MB.121 merged their three copies into it). They are plain strings, not a component, so a server component can call them. `StockBadge` and [`JarShelf`](jar-shelf.md) both use them: the shelf tells a Low or Out jar by the jar's own drawing and a button on its amount (the owner's call, 2026-10-21), with the same tip and description as the badge, and so cannot drift from it. The drawing itself is exported as `StockIcon`, which the shelf puts before a Low or Out amount (MB.121, proposal P1). Both draw that button through `StockTip`, exported beside `StockBadge`: an `IconTip` round a button that takes its name, class and face from its caller, with Low's statement written once out of sight as its description (MB.121 merged the shelf's copy into it). The badge is still the card's jar lines and the Edit Stock dialog's, now unboxed and in the jars' colours ("Styling" below).

## Styling

No box (the owner's call, 2026-10-21): no border, tint or padding. The badge is its drawing alone, drawn in the colour of the matching jar on the entry page's shelf ([`jar-shelf.md`](jar-shelf.md)): Low in `$stock-low-ink` (the warning amber, `$warning`) and Out of Stock in `$stock-out-ink` (the Out of Stock palette's ink, `badge-token('out-of-stock', 'fg')`). The two tokens are the one home of which colour means Low and which Out, read by this badge and by the jar shelf alike (MB.121). It is a button reset to bare (`button-reset(help)`, so the help cursor), with the app's normal focus ring. It is not a `.badge`: its own class, `.stock-badge`, is all that styles it, so neither the badge palettes nor the card's badge sizes reach it, and the card no longer zeroes its padding. Safety stays the only boxed, alarming badge ([`styling.md`](../styling.md), "Badge palettes"). Meaning never rests on colour: the two drawings differ, the slashed ring in place of the double chevron. The drawing sits centred in the same square as before, `$stock-badge-size` (24px), so the jar lines' inset still centres it on the actions' icon below ([`jar-lines.md`](jar-lines.md)).

The inks were checked as text on both surfaces of both themes, and clear 4.5:1: Low 7.55:1 on the dark card and 8.32:1 on the dark page, 5.44:1 on the light card and 4.89:1 on the light page; Out 6.40:1 and 7.04:1 dark, 7.45:1 and 6.70:1 light. The `out-of-stock` palette is now the `ink` treatment, its `fg` alone (`--badge-out-of-stock-fg`, read by this badge and by the jar shelf), and has no `.badge--out-of-stock` class; the `low-stock` palette is unchanged, since the tip bubble and the Compendium mark still use it ([`styling.md`](../styling.md), "Badge palettes"). Until 2026-10-21 the badge wore `.badge--low-stock` (the muted tinted palette) and `.badge--out-of-stock` (a tint of the sealing wax); until 2026-10-20 the badges carried the words ("Low · 6 g", "Out of Stock"), and Out of Stock a 2px border and a heavier weight.

## Stories

[`index.stories.tsx`](../../src/components/StockBadge/index.stories.tsx), under
`Ingredients / Stock Badge`: `States`, a grid of Low, Low Without A Unit, Quantity Equal To The Threshold and Out; Stocked, No Quantity and No Threshold draw nothing.

## Testing

`tests/components/JarShelf/` proves the shelf's amount buttons use these words.

`tests/components/StockBadge/index.test.tsx` walks the shared jar states through
`stockState`, checks which of the two badges shows (and that the other does not), that
a zero threshold still reads Out of Stock at 0, that the two states differ in their
drawing, that neither badge carries words, each badge's name and description, and each
tip's words, opening on focus or after a 300ms rest, closing the moment the pointer
leaves or on Escape, and that the bubble is kept from a screen reader. The `lowStockOnly` filter is proved
on the same jar states, one entry each, in `tests/modules/ingredients/services/workspace-ingredient-list.test.ts`
and its count in `tests/modules/ingredients/services/ingredient-facets.test.ts`.

## Component notes

Facts moved out of the code comments of the stock badge.

- The badge sits in the jar-line slot the ingredient card leaves. A consumer renders it every time and checks nothing; with nothing to flag it renders nothing.
- Each state is its drawing alone in a small square, so neither can rest on colour: Low is a double chevron and Out of Stock a slashed ring. Neither is boxed: the drawing is in the colour of the matching jar on the entry's shelf, the warning amber for Low and Out of Stock's red. Safety stays the only boxed, alarming badge (styling.md).
- The words live in a button name and a tip. Both states are buttons whose only job is to open that tip, and the tips are `IconTip`'s: they open after a rest of the pointer or at once on focus, fade, close the moment the pointer leaves or on Escape, and cannot be hovered.
- Low's tip is one statement of the level, "Low Stock at 10 g or less", without the jar's amount, which the jar line already shows. Out of Stock's is its name.
- The name is an `aria-label` ("Low Stock" / "Out of Stock") so a screen reader has the words without opening the tip. `IconTip`'s bubble is decoration, hidden from a screen reader and mounted only while open, so Low's statement is also written once, out of sight, as the button's description. Out's description would only repeat the name.
- The words are `stock-words.ts`, shared with the entry page's jar shelf, which tells Low and Out by the jar and a button on its amount. That button is `StockTip`, exported from `index.tsx` so the badge and the shelf draw one button with one name and one description.
- The drawing is exported so the shelf puts the same symbol beside a Low or Out amount and the two places never draw the states differently.
- The amount writer is shared by the card's jar line, the Edit Stock dialog's list and the entry page's shelf, so the three never drift.
- Styling: no border, tint or padding. The two states differ by drawing as well as colour. Both inks reach 4.5:1 on the card and the page in both themes. The square is 24px, so the jar lines keep the inset that centres it on the actions' icon below.
- `stockState`: a held jar with no quantity is `ok` (nothing to compare); a quantity of 0 is `out` whatever the threshold; a threshold of 0 or none switches the Low Stock warning off and never means always low. `tests/support/jar-states.ts` holds the shared list of jar states that both copies are tested against; the function is pure so a test can walk every row.
