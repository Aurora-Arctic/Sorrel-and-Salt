# CardDensitySwitch

`src/components/CardDensitySwitch/` — the Compact switch of the coven's Ingredients list and its Grimoire. It is a `SwitchField` labelled "Compact", on by default, and the choice is remembered on this computer. There is one stored choice for both lists, so Compact turned off on the Grimoire is off on the Ingredients list too. It takes no props.

## How the choice reaches the page

- The list renders `data-density="compact"` (`IngredientCardList`), so a first visit, and a visit with script off, show compact.
- A stored Regular choice lives in `localStorage['card-density']`. A pre-paint script (`src/app/pre-paint-scripts.tsx`, the fourth) sets `data-card-density="regular"` on `<html>` before first paint, only when the stored value is `regular`. Compact stored, or nothing, sets nothing, so the compact look never flashes.
- The compact selectors (`IngredientCardList/index.scss`, `IngredientCard/index.scss`, `SpellCard/index.scss` and `Skeleton/index.scss`) end in `:not(:root[data-card-density='regular'] *)`, so the attribute turns compact off. A list that renders `regular` is not touched.
- The switch reads its state from that attribute through `useSyncExternalStore` (a `MutationObserver` subscribes; the server snapshot is compact), so server and browser renders agree. The write sits in a `try`/`catch`: blocked storage keeps the change for the page view and loses only the memory.

`STORAGE_KEY` is exported; the pre-paint script repeats the literal inline, so keep them in sync.

## Placement

Two filter rows draw it: the coven Ingredients list's (`CompendiumListFilter` with `audience="coven"`) and the Grimoire's (`GrimoireList/filter.tsx`), inside the `search` landmark (story 12 counts editing controls outside it). The admin and public compendium lists draw none, because the public compendium shows full cards by design. Its `name` is empty so it never submits with a form it sits in: it changes the view, not the filter. On a phone it wraps to its own line beneath Clear All when that shows (the `.filter-row > .switch` rule in `_primitives.scss`).

Toggling in the workshop sets `data-card-density` on the story frame's `<html>` and writes storage, so the choice carries to other stories until cleared. The `.switch` primitive's forced-colours rule is in [`styling.md`](../styling.md).
