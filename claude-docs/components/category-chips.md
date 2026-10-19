# CategoryChips

An entry's categories as a row of chips: the first `CATEGORY_CHIP_LIMIT` (2) shown, the rest behind a +N button. Shared by the ingredient card ([`ingredient-card.md`](ingredient-card.md)) and the admin Compendium table ([`compendium-list.md`](compendium-list.md)), so both draw and behave alike. `src/components/CategoryChips/`.

## Props

| Prop         | Meaning                                                                                  |
| ------------ | ---------------------------------------------------------------------------------------- |
| `categories` | Each category with its group's colours; none draws no row                                |
| `label`      | The entry's label, for the +N button's and the panel's accessible names                  |
| `compact`    | The tighter chip size for a table cell; the card keeps the regular one (default `false`) |

`CardCategory` and `CATEGORY_CHIP_LIMIT` live here; the card re-exports the type. The chips are full-level chips ([`styling.md`](../styling.md), "Category chips"), plain text and not links; the list is named "Categories".

## The +N toggletip

`category-more.tsx` is a client child, so `CategoryChips` stays server-compatible. Hover or focus opens the panel, a click pins it and a second click closes it. Escape closes it and returns focus to the button; a press outside, or the pointer leaving (after a 120ms grace, WCAG 1.4.13), closes it too. It fades at `$tip-fade`. The button has no dot, and its name carries the count ("3 more categories for Testwort").

The panel is `position: fixed`, placed by Floating UI beneath the chip row (the Combobox's list does the same), as wide as the row and at least 12rem. It is not absolute because the admin table's frame scrolls and would clip or stretch around an absolute panel. It flips above near the window's foot and follows the row only while open. Because it floats, it never changes its row's or card's height. It stands at the `floating` layer, above the rows beneath and their Edit pencils; the card lifts itself with `isolation` and `z-index` while a panel is open (no transform, so fixed placement holds).

## Sizes

`compact` adds `category-chips--compact`, which applies `chip($size: compact)` ([`styling.md`](../styling.md), "Category chips", "Size") to the chips and the button, with a 4px row gap. About 18.8px tall. The +N button's pill is as short, with a transparent 24px hit area (WCAG 2.5.8).

## Testing

`tests/components/CategoryChips` covers the chips, the limit and the panel's open and close paths. Placement and height are measured in a browser: `tests/e2e/public-compendium.spec.ts` (the card) and `tests/e2e/admin-compendium.spec.ts` (the table, desktop and phone).

## Stories

"Surfaces / Category Chips": within the limit, with more, in a scrolling frame, and both sizes.
