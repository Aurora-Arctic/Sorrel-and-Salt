# IngredientCardList

The grid every list of ingredient cards uses (M8.14), so the compendium page (M8.18), the workspace ingredients page (M9.6) and the admin compendium share one layout.

## Props

| Prop       | What it does                                               |
| ---------- | ---------------------------------------------------------- |
| `label`    | The list's accessible name                                 |
| `density`  | `'regular'` (default) or `'compact'`; see below            |
| `children` | One `IngredientCard` per child; each is wrapped in an `li` |

## Contracts

- A `ul` named by `label`, one `li` per card. No cards, no items.
- The grid is `repeat(auto-fill, minmax(min(100%, $ingredient-card-min), 1fr))` with a `space(4)` gap: one column on a phone, two and three as the page widens.
- A page of cards holds `CARD_PAGE_SIZE` (24) entries, which divides by the one to four columns the two densities draw, so the last row is full. The admin tables keep the default of 25.
- `density` is written as `data-density` on the `ul`, always (`regular` states the default). The compact value uses a minimum column of `$ingredient-card-min-compact` and a `space(3)` gap, and switches every card inside to the compact look, which keys off the attribute ([`ingredient-card.md`](ingredient-card.md), "Compact"). The attribute, not a card prop, so a page can set it before React runs. A stored Regular choice (the Compact switch, [`card-density-switch.md`](card-density-switch.md)) puts `data-card-density="regular"` on `<html>` before first paint, and the compact selectors carry `:not(:root[data-card-density='regular'] *)`, so compact switches itself off. Only lists that ask for `compact` are touched; a list rendering `regular` never was compact.
- Each `li` is a flex column and its card stretches, so cards in a row are one height. The grimoire's spell cards (M10.11) stretch the same way, and their foot sits at the bottom by the specimen's `margin-top: auto`.
- While a page is on its way, `ListBody shape="cards"` draws six card-shaped skeletons in the same grid ([`list-frame.md`](list-frame.md)).

## Styling

Tokens only, as signed off in MB.120 (2026-10-20). `IngredientCardList/index.scss` is one auto-fill grid
whose minimum column is a token: the regular card's, and for `data-density='compact'`
`$ingredient-card-min-compact` (16rem, in `_variables.scss`) with a `space(3)` gap. The compact
card's own rules live in `IngredientCard/index.scss`.

**On a phone** the grid's `min(100%, …)` gives one card across, and a column never overflows a container narrower than its minimum; a desktop shows three or four.

**Forced colours.** No rule of its own; the grid draws nothing. What the cards look like there is [`ingredient-card.md`](ingredient-card.md)'s.

## Stories

`States`, with a control that chooses Default (the compendium grid), Cupboard Grid and Cupboard Grid Compact: the same nine invented entries (`story-fixtures.tsx`), the compendium's without marks, jars or actions, the cupboard's with them.

## Testing

`tests/components/IngredientCardList/index.test.tsx`: the named list, one item per card, none for none, the density (regular stated by default, compact when told), and the pending cards state.
