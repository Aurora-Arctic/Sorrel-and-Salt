# CategoryChips

`src/components/CategoryChips/` draws an entry's categories as a row of chips: the first `CATEGORY_CHIP_LIMIT` (2) shown, the rest behind a +N button. The ingredient card ([`ingredient-card.md`](ingredient-card.md)) and the admin Compendium table ([`compendium-list.md`](compendium-list.md)) share it, so both draw and behave alike. `CardCategory` and `CATEGORY_CHIP_LIMIT` live here, and the card re-exports the type. The props are in `types.ts`.

## Contracts

- **The chips are full-level chips** ([`styling.md`](../styling.md), "Category chips"), plain text and not links; the list is named "Categories". None given draws no row.
- **`showAll` and `limit`.** The spell recipe and Category Match's Carried and Missing rows draw every chip with `showAll`; Category Match's Extra row passes `limit={8}`. `tipOf` is used by Category Match: given, every chip, including those behind +N, is a button carrying the tip, opened by hover, focus and tap and described by it for a screen reader.
- **A category only a form carries.** A `CardCategory` may carry `forms`, the names of the forms that carry a category its entry does not (a result card reads them, [`compendium-read.md`](../db/compendium-read.md), "What a result card shows"). Such a chip is a tip chip whatever `tipOf` says, its tip naming the forms ("On: Oil, Dried Leaf"), drawn as the plain chip with a dashed border (`.category-chips__form-chip`) so it reads apart from the entry's own. The caller puts those chips after the entry's own; the row keeps the order it is given. `chip-tip.ts` picks a chip's tip.
- **The +N toggletip.** `category-tip-chip.tsx` is the chip with a tip: an `IconTip` around a button (so focus and a tap reach it) plus a visually hidden copy of the words that the button points at with `aria-describedby`. Both it and `category-more.tsx` are client children, so `CategoryChips` stays server-compatible.
  - Focus opens the panel at once. A hover opens it once the pointer has rested 300ms, as every tip does (`TIP_OPEN_DELAY_MS`; [`info-tip.md`](info-tip.md), "Behaviour"), so a pointer crossing the row opens nothing. A pointer that leaves sooner opens nothing either, since the wait and the leave's grace share one timer.
  - A click (a tap) pins it open at once and a second click closes it. Escape closes it and returns focus to the button; a press outside, or the pointer leaving (after a 120ms grace, WCAG 1.4.13), closes it too. It fades at `$tip-fade`.
  - The button has no dot, and its name carries the count ("3 more categories for Testwort").
- **The panel is `position: fixed`**, placed by Floating UI beneath the chip row (the Combobox's list does the same), as wide as the row and at least 12rem. It is not absolute because the admin table's frame scrolls and would clip or stretch around an absolute panel. It flips above near the window's foot and follows the row only while open. Because it floats, it never changes its row's or card's height. It stands at the `floating` layer, above the rows beneath and their Edit pencils; the card lifts itself with `isolation` and `z-index` while a panel is open (no transform, so fixed placement holds).
- **`compact`** adds `category-chips--compact`, which applies `chip($size: compact)` ([`styling.md`](../styling.md), "Category chips", "Size") to the chips and the button, with a 4px row gap. About 18.8px tall. The +N pill is as short, with a transparent 24px hit area (WCAG 2.5.8).

## Styling

Tokens only. `index.scss` styles the chip inside the list (`.category-chips .chip`), the +N item (`.category-more-item`) and its button (`.category-more__button`, a `space()` step), the toggletip's fixed panel and its fade (`.category-more__panel`), the compact size and the form-only chip (no fill, a border in the group's own colour through `group-colour()`; [`m14.38-form-categories-in-search.md`](../design-decisions/m14.38-form-categories-in-search.md)). The chip itself is the shared `.chip` primitive.

- **On a phone** the chips wrap with their row. The panel is fixed, so a narrow card or table frame never clips it. Under reduced motion it appears without fading.
- **Forced colours.** A chip keeps its 1px border, which forced colours repaints in the system's ink. The panel's `modal-surface` shadow is not drawn, so it takes a 1px `CanvasText` border. The +N button's hover and open fills are dropped: hover turns its border `Highlight`, and open (`aria-expanded`) fills it `Highlight` with `HighlightText` ink.

## Not here

Stories: `src/components/CategoryChips/index.stories.tsx` ("Ingredients / Category Chips", `States`). Tests: `tests/components/CategoryChips`; placement and height are measured in a browser by `tests/e2e/public-compendium.spec.ts` (the card) and `tests/e2e/admin-compendium.spec.ts` (the table, desktop and phone).
