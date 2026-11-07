# StockBadge

`src/components/StockBadge/` flags a jar that is running low or empty: Low Stock or Out of Stock for one jar, or nothing. The ingredient card and the entry page leave a slot on each jar line for it. A consumer renders it for every jar and checks nothing itself. `quantity` `null` is held but not weighed; `threshold` `null` or 0 means no Low Stock badge.

## Contracts

### The table

`stockState(quantity, threshold)` (`stock-state.ts`) is a pure function and the one place this table is written in code:

| A jar whose quantity is …                                                 | Shows        |
| ------------------------------------------------------------------------- | ------------ |
| 0, whatever its threshold                                                 | Out of Stock |
| above 0, and at or below its threshold, when the threshold is above 0     | Low Stock    |
| above its threshold, or anything above 0 when the threshold is 0 or empty | No badge     |
| empty (held, unweighed)                                                   | No badge     |

- **The server's `lowStockOnly` filter says the same thing in SQL** (`holdsJarLowOrOut` in `src/db/repository/ingredients.ts`; [`../db/stock.md`](../db/stock.md)). A change to the table is a change to both. [`tests/support/jar-states.ts`](../../tests/support/jar-states.ts) holds one list of jar states that both are tested against, so a change to one copy alone fails.
- **A threshold of 0 or none shows no Low badge.** It never means "always low". A jar at 0 still reads Out of Stock.

### The badge

- **Per jar, not per entry.** A card holding two forms can show Low Stock on one and nothing on the other.
- **Each badge is its drawing alone**, a 24px square holding the icon, with no words on it. It is a button whose only job is to open a tip.
- **The tip is an `IconTip`'s** ([`icon-tip.md`](icon-tip.md)), and **cannot be hovered**. A hoverable bubble is not wanted here, because the bubble only repeats what the badge's name says and lingering it covers what is beside the badge. The words are on the button as its name and description, so WCAG 1.4.13's purpose is met without it.
- **Low's tip is one statement**, "Low Stock at 10 g or less": the threshold and unit as a plain number, **without the current amount**, which the jar line already shows. **Out of Stock's tip is "Out of Stock".**
- **The words are in the name, not on the badge.** The button's `aria-label` is "Low Stock" or "Out of Stock". Low's statement is its `aria-describedby`, so a screen reader hears the level as the description and not as part of the name. Out of Stock has no description, because its tip would only repeat the name.
  - An icon tip's bubble is `aria-hidden` and mounted only while open, so it cannot be the description. `StockBadge` writes the statement once more beside the button as a `.visually-hidden` span, and `IconTip` takes no new prop for it.
- **The meaning never rests on colour.** Each state has its own drawing (a double down chevron for Low, a slashed ring for Out) as well as its tint, and the name and the tip carry the words.

### Shared words

The badge's words are written once, in `stock-words.ts` beside it, as plain strings so a server component can call them: `stockName`, `stockTip`, `withUnit`, and `amountText(quantity, unit)`, the jar's amount or **Unmeasured** when no quantity is recorded. The card's jar lines, the Edit Stock dialog's list and the shelf all use `amountText`, so the three never drift.

[`JarShelf`](jar-shelf.md) uses these words too. The shelf tells a Low or Out jar by the jar's own drawing and a button on its amount, with the same tip and description as the badge. The drawing is exported as `StockIcon`. Both draw that button through `StockTip`, exported beside `StockBadge` from `index.tsx`: an `IconTip` round a button that takes its name, class and face from its caller, with Low's statement written once out of sight as its description.

## Styling

- **No box**: the badge is its drawing alone, in the colour of the matching jar on the entry page's shelf ([`jar-shelf.md`](jar-shelf.md)). Low is `$stock-low-ink` (the warning amber, `$warning`) and Out of Stock is `$stock-out-ink` (`badge-token('out-of-stock', 'fg')`). The two tokens are the one home of which colour means Low and which Out, read by this badge and by the jar shelf alike.
- **It is not a `.badge`:** its own class, `.stock-badge`, is all that styles it, so neither the badge palettes nor the card's badge sizes reach it. Safety stays the only boxed, alarming badge ([`styling.md`](../styling.md), "Badge palettes").
- **The drawing is centred in a `$stock-badge-size` (24px) square**, so the jar lines' inset still centres it on the actions' icon below ([`jar-shelf.md`](jar-shelf.md), "Jar lines").
- **The inks clear 4.5:1 as text on both surfaces of both themes.** Low: 7.55:1 on the dark card, 8.32:1 on the dark page, 5.44:1 on the light card, 4.89:1 on the light page. Out: 6.40:1 and 7.04:1 dark, 7.45:1 and 6.70:1 light.
- **The `out-of-stock` palette is the `ink` treatment**, its `fg` alone (`--badge-out-of-stock-fg`), and has no `.badge--out-of-stock` class. The `low-stock` palette keeps its tint, because the tip bubble and the Compendium mark still use it ([`styling.md`](../styling.md), "Badge palettes").

## Not here

Stories: [`index.stories.tsx`](../../src/components/StockBadge/index.stories.tsx). Tests: `tests/components/StockBadge/index.test.tsx` walks the shared jar states through `stockState`. `tests/components/JarShelf/` proves the shelf's amount buttons use these words. The `lowStockOnly` filter is proved on the same jar states in `tests/modules/ingredients/services/workspace-ingredient-list.test.ts`, and its count in `tests/modules/ingredients/services/ingredient-facets.test.ts`.
