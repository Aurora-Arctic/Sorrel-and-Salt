# IngredientCardList

The grid every list of cards uses, so the compendium page, the workspace ingredients page, the admin compendium and the grimoire (its spell cards) share one layout. One card per child, an `IngredientCard` or a `SpellCard`, each wrapped in an `li`.

## Contracts

- A page of cards holds `CARD_PAGE_SIZE` (24) entries, which divides by the one to four columns the two densities draw, so the last row is full. The admin tables keep the default of 25.
- `density` is written as `data-density` on the `ul`, always (`regular` states the default). The compact value switches every card inside to the compact look, which keys off the attribute ([`ingredient-card.md`](ingredient-card.md), "Compact"). The attribute, not a card prop, so a page can set it before React runs. A stored Regular choice (the Compact switch, [`card-density-switch.md`](card-density-switch.md)) puts `data-card-density="regular"` on `<html>` before first paint, and the compact selectors carry `:not(:root[data-card-density='regular'] *)`, so compact switches itself off. Only lists that ask for `compact` are touched; a list rendering `regular` never was compact.
- Each `li` is a flex column and its card stretches, so cards in a row are one height. The grimoire's spell cards stretch the same way, and their foot sits at the bottom by the specimen's `margin-top: auto`.
- While a page is on its way, the list's `ListBody` `skeleton` draws six card-shaped skeletons in the same grid ([`list-frame.md`](list-frame.md)).
- The compact card's own rules live in `IngredientCard/index.scss`. The grid draws nothing in forced colours; what the cards look like there is [`ingredient-card.md`](ingredient-card.md)'s.

## Cards off screen

Inside `@supports (content-visibility: auto)`, an `li` marked `data-skippable` skips layout and paint while it is far from the viewport, with `contain-intrinsic-size: auto 16rem` so the scroll length holds until a card has been drawn once. The list is a client component only to set that mark: at the page's first scroll, which is also the browser's own restore on Back, it marks each card whose top is below the window. Until then every card is laid out at its real height, and a card above or within the window is never marked, so Back restores a scroll position into a list of the length it was left at. Skipping from the first frame stood 16rem in for cards above the restored position, and Back landed a few hundred pixels off. A card that is hovered, has focus inside it or has its category panel open opts out, because paint containment would clip the tips and turn the panel's fixed position into one inside the card. A browser without the property draws every card.
