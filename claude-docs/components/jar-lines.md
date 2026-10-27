# JarLines

`src/components/JarLines/` — the jar lines of an ingredient card (M9.6): what the coven holds of an entry, one line per jar, drawn into the card's `children` slot ([`ingredient-card.md`](ingredient-card.md)).

## Props

`jars`: a list of plain data, `{ id, form, icon, quantity, unit, threshold }` (`types.ts`).

- `form` is the variant's form as stored; the line writes it through `formLabel`, which the lint rule `sorrel/form-shown-through-form-label` holds.
- `icon` is the form group's icon or `null`; `FormIcon` draws the generic spoon for `null`.
- `quantity`: a number is on hand, `0` is out, `null` is held but not measured and reads "Unmeasured".
- `unit` follows the quantity; `threshold` only feeds the badge.

## What a line holds

One `li` per jar in a `ul` that the card's `.specimen__stock > ul` primitive lays out: the form icon and name, a decorative dot with the comma a screen reader hears in its place (the owner's rule is "dot, never a comma"), the quantity and unit, and [`StockBadge`](stock-badge.md) last, at the right-hand end of the line, which draws Low Stock, Out of Stock or nothing under its own table.

## Where the badge sits

The badge is centred on the same vertical line as the icon below it in the card's actions (the owner's call, 2026-10-20), the rightmost of Edit, Annotate or the three dots. The jar lines and the actions row share a right edge (measured: both run 32 to 303 at 1280 wide and 32 to 358 at 390), and the actions' buttons are the large icon button (`$icon-size-large`, 32px) while the badge is `$stock-badge-size` (24px), so `.specimen__stock > ul > li` in `_primitives.scss` insets its end by half the difference, `calc((#{$icon-size-large} - #{$stock-badge-size}) / 2)`, and no pixel value is written down. Measured with Playwright on the demo seed's Whitethorn Coven: badge centre against the three dots' centre was 291 against 287 at 1280 and 346 against 342 at 390 before the inset, and 287 against 287 and 342 against 342 after. The inset lives in the shared primitive, so every card that draws jar lines above its actions (the coven card and [`IngredientCard`](ingredient-card.md) are one component) follows it.

## One source

The workshop's card stories (`IngredientCard/story-jars.tsx`, `IngredientCardList/story-fixtures.tsx`) draw their jar lines through this component, so no story keeps a copy of the markup.

## Tests

`tests/components/JarLines/index.test.tsx`: one item per jar, the form through `formLabel`, the quantity, the badge per jar, a jar held without a quantity, and the hidden dot with its spoken comma.
