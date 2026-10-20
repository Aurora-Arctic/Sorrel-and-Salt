# CardDensitySwitch

`src/components/CardDensitySwitch/` — the Compact switch of a list of ingredient cards (M9.6). It is a `SwitchField` labelled "Compact", on by default, and the choice is remembered on this computer.

## How the choice reaches the page

- The list renders `data-density="compact"` (`IngredientCardList`), so a first visit, and a visit with script off, show compact.
- A stored Regular choice lives in `localStorage['card-density']`. A pre-paint script (`src/app/pre-paint-scripts.tsx`, the fourth) sets `data-card-density="regular"` on `<html>` before first paint, only when the stored value is `regular`. Compact stored, or nothing, sets nothing, so the compact look never flashes.
- The compact selectors (`IngredientCardList/index.scss`, `IngredientCard/index.scss`) end in `:not(:root[data-card-density='regular'] *)`, so the attribute turns compact off. A list that renders `regular` is not touched.
- The switch reads its state from that attribute through `useSyncExternalStore` (a `MutationObserver` subscribes; the server snapshot is compact), so server and browser renders agree. Turning it off sets the attribute and stores `regular`; turning it on removes the attribute and stores `compact`. The write sits in a `try`/`catch`: blocked storage keeps the change for the page view and loses only the memory.

`STORAGE_KEY` is exported; the pre-paint script repeats the literal inline, so keep them in sync.

## Placement

The coven list's filter (`CompendiumListFilter` with `audience="coven"`, a client component like the switch) draws it in its row, inside the `search` landmark (story 12 counts editing controls outside it). The admin and public compendium lists draw none. Its `name` is empty so it never submits with a form it sits in: it changes the view, not the filter.

## Styling

The switch has no stylesheet of its own: it is a plain switch control. What it changes is styled by the
cards. The compact selectors, with the `:not(:root[data-card-density='regular'] *)` guard, are in
`IngredientCard/index.scss` (the `[data-density='compact']` block, with the `_compact.scss` partial it uses) and `IngredientCardList/index.scss` (the grid).

**On a phone** the switch sits in the coven list's filter row (`CompendiumList/filter.tsx`), and nowhere on the public compendium. It sits on the Filters line with its label beside it, the pair a control's height and level with the button (the `.filter-row > .switch` rule in `_primitives.scss`, the owner's call at MB.120's review, 2026-10-20); with Clear All showing it wraps to its own line beneath, aligned to the start. The workshop shows both: `CovenRowPhoneDark` and `CovenRowPhoneLight`, `CovenRowFilteredPhoneDark` and `CovenRowFilteredPhoneLight`. The compact grid's narrower column still comes to one card across at 375px.

**Forced colours.** The switch is the `.switch` primitive, whose forced-colours rule paints the thumb in the system's ink ([`styling.md`](../styling.md)).

## Tests

`tests/components/CardDensitySwitch/index.test.tsx`: default on, starting off from the attribute, the attribute and storage on each toggle, blocked storage, and following an outside change. `tests/app/pre-paint-scripts.test.tsx` covers the script.
