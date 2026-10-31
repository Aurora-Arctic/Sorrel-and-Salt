# CardDensitySwitch

`src/components/CardDensitySwitch/` — the Compact switch of the coven's Ingredients list and its Grimoire (M9.6). It is a `SwitchField` labelled "Compact", on by default, and the choice is remembered on this computer. There is one stored choice for both lists, so Compact turned off on the Grimoire is off on the Ingredients list too.

## Props

None. The switch reads and writes the one stored choice itself.

## How the choice reaches the page

- The list renders `data-density="compact"` (`IngredientCardList`), so a first visit, and a visit with script off, show compact.
- A stored Regular choice lives in `localStorage['card-density']`. A pre-paint script (`src/app/pre-paint-scripts.tsx`, the fourth) sets `data-card-density="regular"` on `<html>` before first paint, only when the stored value is `regular`. Compact stored, or nothing, sets nothing, so the compact look never flashes.
- The compact selectors (`IngredientCardList/index.scss`, `IngredientCard/index.scss`, `SpellCard/index.scss` and `Skeleton/index.scss`) end in `:not(:root[data-card-density='regular'] *)`, so the attribute turns compact off. A list that renders `regular` is not touched.
- The switch reads its state from that attribute through `useSyncExternalStore` (a `MutationObserver` subscribes; the server snapshot is compact), so server and browser renders agree. Turning it off sets the attribute and stores `regular`; turning it on removes the attribute and stores `compact`. The write sits in a `try`/`catch`: blocked storage keeps the change for the page view and loses only the memory.

`STORAGE_KEY` is exported; the pre-paint script repeats the literal inline, so keep them in sync.

## Placement

Two filter rows draw it: the coven Ingredients list's (`CompendiumListFilter` with `audience="coven"`) and the Grimoire's (`GrimoireList/filter.tsx`), each a client component like the switch, in its row, inside the `search` landmark (story 12 counts editing controls outside it). The admin and public compendium lists draw none, deliberately: the switch is on the coven’s lists only, because the public compendium shows full cards by design (the owner’s call, 2026-10-20). Its `name` is empty so it never submits with a form it sits in: it changes the view, not the filter.

## Styling

The switch has no stylesheet of its own: it is a plain switch control. What it changes is styled by the
cards. The compact selectors, with the `:not(:root[data-card-density='regular'] *)` guard, are in
`IngredientCard/index.scss` and `SpellCard/index.scss` (each a `[data-density='compact']` block, with the `_compact.scss` partial it uses), `IngredientCardList/index.scss` (the grid) and `Skeleton/index.scss` (the loading cards).

**On a phone** the switch sits in the filter row (`CompendiumList/filter.tsx` on Ingredients, `GrimoireList/filter.tsx` on the Grimoire), and nowhere on the public compendium. It sits on the Filters line with its label beside it, the pair a control's height and level with the button (the `.filter-row > .switch` rule in `_primitives.scss`, the owner's call at MB.120's review, 2026-10-20); with Clear All showing it wraps to its own line beneath, aligned to the start. The workshop shows both (below). The compact grid's narrower column still comes to one card across at 375px.

**Forced colours.** The switch is the `.switch` primitive, whose forced-colours rule paints the thumb in the system's ink ([`styling.md`](../styling.md)).

## Stories

`Forms / Card Density Switch` has one story, `States`, with a control that chooses Switch (the switch alone; toggling it sets `data-card-density` on the story frame's `<html>` and writes storage, so the choice carries to other stories until cleared), Coven Row (the Ingredients filter row with no filter, the switch on the Filters line) and Coven Row Filtered (a form chosen, so Clear All shows and the switch wraps beneath).

## Tests

`tests/components/CardDensitySwitch/index.test.tsx`: default on, starting off from the attribute, the attribute and storage on each toggle, blocked storage, and following an outside change. `tests/app/pre-paint-scripts.test.tsx` covers the script.
