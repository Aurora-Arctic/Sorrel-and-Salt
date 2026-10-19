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
- `density` is written as `data-density` on the `ul`, always (`regular` states the default). The compact value uses a 16rem minimum column and a `space(3)` gap, and switches every card inside to the compact look, which keys off the attribute ([`ingredient-card.md`](ingredient-card.md), "Compact"). The attribute, not a card prop, so a page can set it before React runs.
- Each `li` is a flex column and its card stretches, so cards in a row are one height.
- While a page is on its way, `ListBody shape="cards"` draws six card-shaped skeletons in the same grid ([`list-frame.md`](list-frame.md)).

## Stories

`Compendium Grid` and `Cupboard Grid` (regular), `Cupboard Grid Compact`: the same nine invented entries (`story-fixtures.tsx`), the compendium's without marks, jars or actions, the cupboard's with them.

## Testing

`tests/components/IngredientCardList/index.test.tsx`: the named list, one item per card, none for none, the density (regular stated by default, compact when told), and the pending cards state.
