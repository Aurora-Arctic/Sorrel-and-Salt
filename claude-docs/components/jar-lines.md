# JarLines

`src/components/JarLines/` — the jar lines of an ingredient card (M9.6): what the coven holds of an entry, one line per jar, drawn into the card's `children` slot ([`ingredient-card.md`](ingredient-card.md)).

## Props

`jars`: a list of plain data, `{ id, form, icon, quantity, unit, threshold }` (`types.ts`).

- `form` is the variant's form as stored; the line writes it through `formLabel`, which `tests/guards/form-label.test.ts` holds.
- `icon` is the form group's icon or `null`; `FormIcon` draws the generic spoon for `null`.
- `quantity`: a number is on hand, `0` is out, `null` is held but not measured and reads "Unmeasured".
- `unit` follows the quantity; `threshold` only feeds the badge.

`edit`, optional: `{ workspaceId, ingredient }`, the coven's id and the entry's coven label. Given, each line ends with an [`EditStock`](edit-stock.md) pencil for its jar (M9.9); left out, as for a viewer, the lines are plain text. The prop carries the role's permission, so the component asks nothing of the session.

## What a line holds

One `li` per jar in a `ul` that the card's `.specimen__stock > ul` primitive lays out: the form icon and name, a decorative dot with the comma a screen reader hears in its place (the owner's rule is "dot, never a comma"), the quantity and unit, and [`StockBadge`](stock-badge.md) last, which draws Low Stock, Out of Stock or nothing under its own table.

## One source

The workshop's card stories (`IngredientCard/story-jars.tsx`, `IngredientCardList/story-fixtures.tsx`) draw their jar lines through this component, so no story keeps a copy of the markup.

## Tests

`tests/components/JarLines/index.test.tsx`: one item per jar, the form through `formLabel`, the quantity, the badge per jar, a jar held without a quantity, the hidden dot with its spoken comma, and the Edit Stock button, drawn when `edit` is given, named for the ingredient and the jar's form, and absent when it is not.
