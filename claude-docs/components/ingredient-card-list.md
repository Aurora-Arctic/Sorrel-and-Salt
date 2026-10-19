# IngredientCardList

The grid every list of ingredient cards uses (M8.14), so the compendium page (M8.18), the workspace ingredients page (M9.6) and the admin compendium share one layout.

## Props

| Prop       | What it does                                               |
| ---------- | ---------------------------------------------------------- |
| `label`    | The list's accessible name                                 |
| `children` | One `IngredientCard` per child; each is wrapped in an `li` |

## Contracts

- A `ul` named by `label`, one `li` per card. No cards, no items.
- The grid is `repeat(auto-fill, minmax(min(100%, $ingredient-card-min), 1fr))` with a `space(4)` gap: one column on a phone, two and three as the page widens.
- Each `li` is a flex column and its card stretches, so cards in a row are one height.
- While a page is on its way, `ListBody shape="cards"` draws six card-shaped skeletons in the same grid ([`list-frame.md`](list-frame.md)).

## Stories

`Ingredient Card List / Grid`: six mixed cards, one with actions, one retired and annotated.

## Testing

`tests/components/IngredientCardList/index.test.tsx`: the named list, one item per card, none for none, and the pending cards state.
