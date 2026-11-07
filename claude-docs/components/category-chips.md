# CategoryChips

`src/components/CategoryChips/` draws an entry's categories as a row of chips: the first `CATEGORY_CHIP_LIMIT` (2) shown, the rest behind a +N button. The ingredient card ([`ingredient-card.md`](ingredient-card.md)) and the admin Compendium table ([`compendium-list.md`](compendium-list.md)) share it. `CardCategory` and `CATEGORY_CHIP_LIMIT` live here; the card re-exports the type. Props: `types.ts`.

## Contracts

- **Full-level chips** ([`styling.md`](../styling.md), "Category chips"), plain text, not links; the list is named "Categories". None given draws no row.
- **`showAll` and `limit`.** The spell recipe and Category Match's Carried and Missing rows pass `showAll`; Category Match's Extra row passes `limit={8}`. With `tipOf` (Category Match), every chip, including those behind +N, is a button carrying the tip, opened by hover, focus and tap and described by it for a screen reader.
- **A category only a form carries.** A `CardCategory` may carry `forms`, the forms that carry a category its entry does not ([`compendium-read.md`](../db/compendium-read.md), "What a result card shows"). Such a chip is a tip chip whatever `tipOf` says, its tip naming the forms ("On: Oil, Dried Leaf"), drawn with a dashed border (`.category-chips__form-chip`) to read apart from the entry's own. The caller puts those after the entry's own; the row keeps the order given. `chip-tip.ts` picks a chip's tip.
- **The tip chip and +N toggletip** (`category-tip-chip.tsx`, `category-more.tsx`) are client children, so `CategoryChips` stays server-compatible. A tip chip is an `IconTip` around a button (so focus and a tap reach it) plus a visually hidden copy of the words the button points at with `aria-describedby`.
  - Focus opens the panel at once. A hover opens it once the pointer has rested 300ms (`TIP_OPEN_DELAY_MS`; [`info-tip.md`](info-tip.md), "Behaviour"); a pointer that leaves sooner opens nothing, since the wait and the leave's grace share one timer.
  - A click or tap pins it open; a second closes it. Escape closes it and returns focus to the button; a press outside, or the pointer leaving (after a 120ms grace, WCAG 1.4.13), closes it too.
  - The +N button's name carries the count ("3 more categories for Testwort").
- **The panel is `position: fixed`**, placed by Floating UI beneath the chip row (as the Combobox's list is), as wide as the row and at least 12rem. Not absolute, because the admin table's frame scrolls and would clip or stretch it. It flips above near the window's foot, follows the row only while open, and never changes its row's or card's height. It stands at the `floating` layer, above the rows beneath and their Edit pencils; the card lifts itself with `isolation` and `z-index` while a panel is open (no transform, so fixed placement holds).
- **`compact`** applies `chip($size: compact)` ([`styling.md`](../styling.md), "Category chips", "Size") to the chips and button, with a 4px row gap. The +N pill is as short, with a transparent 24px hit area (WCAG 2.5.8).

## Styling

Tokens only. The form-only chip has no fill and a border in the group's own colour through `group-colour()` ([`ingredients.md`, "How search shows and filters on a form's categories"](../design-decisions/ingredients.md#how-search-shows-and-filters-on-a-forms-categories)).

- **Forced colours.** The panel's `modal-surface` shadow is not drawn, so it takes a 1px `CanvasText` border. The +N button's hover and open fills are dropped: hover turns its border `Highlight`, and open (`aria-expanded`) fills it `Highlight` with `HighlightText` ink.

## Stories and tests

`src/components/CategoryChips/index.stories.tsx` ("Ingredients / Category Chips", `States`); `tests/components/CategoryChips`; placement and height are measured in a browser by `tests/e2e/public-compendium.spec.ts` (the card) and `tests/e2e/admin-compendium.spec.ts` (the table, desktop and phone).
